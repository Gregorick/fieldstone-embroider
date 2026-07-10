import { supabase } from "@/lib/supabase";

// 1. FUNCIÓN PRINCIPAL PARA PROCESAR LA ORDEN
export async function createCompleteOrder(
  cartItems: any[], 
  customerDetails: { name: string; email: string; total: number }, 
  userId: string | null
) {
  try {
    // 1. Recuperar el Logo en Base64 desde el LocalStorage
    const base64Logo = localStorage.getItem("user_custom_logo");
    let logoPublicUrl = null;

    // 2. Si hay logo, convertirlo de Base64 a Archivo y subirlo al Bucket de Supabase
    if (base64Logo) {
      // Truco para convertir Base64 a Blob (Archivo)
      const fetchResponse = await fetch(base64Logo);
      const blob = await fetchResponse.blob();
      
      // Crear un nombre único para que no se sobreescriban
      const fileExtension = blob.type.split('/')[1] || 'png';
      const uniqueFileName = `logo-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('customer-logos')
        .upload(uniqueFileName, blob, { 
          contentType: blob.type,
          upsert: false
        });

      if (uploadError) throw new Error(`Error uploading logo: ${uploadError.message}`);

      // Obtener el link público de descarga para el admin
      const { data: publicUrlData } = supabase.storage
        .from('customer-logos')
        .getPublicUrl(uniqueFileName);
        
      logoPublicUrl = publicUrlData.publicUrl;
    }

    // 3. Crear la Orden Principal
    const { data: order, error: orderError } = await supabase.from('orders').insert({
      user_id: userId || null,
      customer_email: customerDetails.email,
      customer_name: customerDetails.name,
      total_amount: customerDetails.total,
      payment_status: 'paid', // O 'pending', dependiendo de tu pasarela
      order_status: 'processing'
    }).select().single();

    if (orderError) throw new Error(`Error creating order: ${orderError.message}`);

    // 4. Crear los Detalles de los Productos (Mapear el carrito a la BD)
    const itemsToInsert = cartItems.map(item => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.title,
      quantity: item.quantity,
      unit_price: item.price,
      color: item.color,
      size: item.size,
      decoration_method: item.decorationMethod,
      location: item.location || 'Standard',
      extra_comments: item.extraComments || '',
      custom_logo_url: logoPublicUrl
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
    if (itemsError) throw new Error(`Error creating order items: ${itemsError.message}`);

    // 5. Si el usuario NO está logueado, guardar el ID de la orden en LocalStorage (durará 7 días)
    if (!userId) {
      saveGuestOrderToLocal(order.id);
    }

    // 6. Limpiar el Logo del LocalStorage (ya no se necesita, está en la Nube)
    localStorage.removeItem("user_custom_logo");

    return { success: true, orderId: order.id };

  } catch (error: any) {
    console.error("Order Creation Failed:", error);
    return { success: false, error: error.message };
  }
}

// 2. FUNCIÓN AUXILIAR PARA GUARDAR EN LOCALSTORAGE
function saveGuestOrderToLocal(orderId: string) {
  const existingOrdersStr = localStorage.getItem('guest_pending_orders');
  const existingOrders = existingOrdersStr ? JSON.parse(existingOrdersStr) : [];
  
  // Guardamos el ID y la fecha exacta de compra
  existingOrders.push({ id: orderId, timestamp: Date.now() });
  localStorage.setItem('guest_pending_orders', JSON.stringify(existingOrders));
}

// 3. FUNCIÓN PARA ENLAZAR ÓRDENES CUANDO EL USUARIO SE REGISTRA O INICIA SESIÓN
export async function linkGuestOrdersToAccount(userId: string) {
  const existingOrdersStr = localStorage.getItem('guest_pending_orders');
  if (!existingOrdersStr) return;

  const existingOrders = JSON.parse(existingOrdersStr);
  if (existingOrders.length === 0) return;

  // Filtrar solo las órdenes que tengan menos de 7 días de antigüedad (7 días = 604800000 ms)
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const validOrderIds = existingOrders
    .filter((o: any) => (Date.now() - o.timestamp) < SEVEN_DAYS_MS)
    .map((o: any) => o.id);

  if (validOrderIds.length > 0) {
    // Actualizar la base de datos para asignar estas órdenes al nuevo usuario
    const { error } = await supabase
      .from('orders')
      .update({ user_id: userId })
      .in('id', validOrderIds);

    if (!error) {
      console.log("Successfully linked guest orders to new account.");
    }
  }

  // Limpiar el LocalStorage porque ya están enlazadas
  localStorage.removeItem('guest_pending_orders');
}