import { getLiveInventory } from "@/app/actions/sanmarApi"; 

export default async function TestSanMar() {
  const styleToTest = "29M"; 
  const stockInfo = await getLiveInventory(styleToTest);

  return (
    <div className="p-10 font-sans">
      <h1 className="text-3xl font-black uppercase mb-2">Test de API SanMar (PromoStandards)</h1>
      <p className="text-gray-500 mb-6 font-medium">
        Consultando inventario en tiempo real para el estilo: <span className="text-black font-bold">{styleToTest}</span>
      </p>

      {(!stockInfo || stockInfo.length === 0) ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200 font-bold">
          No se recibieron datos o el arreglo está vacío.
        </div>
      ) : (
        <pre className="bg-gray-900 text-green-400 p-6 rounded-lg text-xs overflow-auto max-h-[600px] shadow-xl">
          {JSON.stringify(stockInfo, null, 2)}
        </pre>
      )}
    </div>
  );
}