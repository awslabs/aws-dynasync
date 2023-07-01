import { DbTable } from "./db/table";

export function getName(...names: string[]): string {
    return names.join('-');
}

export function capitalize(str:string): string {
    return str.substring(0,1).toUpperCase() + (str.length > 1 ? str.substring(1) : '');
}

export function validateTable(table: DbTable) {
    if (!table.attributes[table.pName]) {
        throw new Error(`Partition Key ${table.pName} must be present in attributes ${JSON.stringify(table.attributes,null,'\t')}`)
    }
    if (table.sName && !table.attributes[table.sName]) {
        throw new Error(`Sort Key ${table.sName} must be present in attributes ${JSON.stringify(table.attributes,null,'\t')}`)
    }
}