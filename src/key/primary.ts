import { KeyInstance } from "./instance"
import { BaseKey } from "./base";
import { KeyAttributes } from "../types";

export class SchemaPrimaryKey extends BaseKey {
    partitionKey: KeyInstance
    sortKey?: KeyInstance

    constructor(
        partitionKey: string | KeyInstance,
        sortKey?: string | KeyInstance
    ) {
        super();
        this.partitionKey = this.getKey(partitionKey);
        this.sortKey = sortKey ? this.getKey(sortKey) : undefined;
    }

    get pName(): string {
        return this.partitionKey.name
    }

    get sName(): string | undefined {
        return this.sortKey?.name
    }

    get keySchema(): KeyAttributes {
        const res: KeyAttributes = {
            partitionKey: this.partitionKey.attribute
        }
        if (this.sortKey) res.sortKey = this.sortKey.attribute;
        return res;
    }
}