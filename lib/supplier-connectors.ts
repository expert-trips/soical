// A connector is registered in server code only after a provider-specific implementation exists.
// No credentials or arbitrary endpoint execution are stored in the business catalog.
export type SupplierConnector={key:string;services:string[];search:(input:unknown)=>Promise<unknown>;quote:(input:unknown)=>Promise<unknown>};
const registeredConnectors:Readonly<Record<string,SupplierConnector>>={};
export function supplierConnectionStatus(){return {status:'غير مربوط',implementedAdapters:Object.keys(registeredConnectors).length};}
