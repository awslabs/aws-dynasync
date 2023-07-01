import { KeyInstance } from "./instance";
import { BaseIndexKey } from "./index-base";
import { GlobalSecondaryIndexProps } from "aws-cdk-lib/aws-dynamodb";
import { Capacity } from "../types";

export class SchemaGlobalIndex extends BaseIndexKey {
    partitionKey: KeyInstance
    sortKey?: KeyInstance
    constructor(
        indexName: string,
        partitionKey: string | KeyInstance,
        sortKey?: string | KeyInstance,
        protected serialize?: boolean,
        protected include?: string[],
        capacity?: Capacity

    ) {
        super(indexName, include, capacity);
        this.partitionKey = this.getKey(partitionKey);
        this.sortKey = sortKey ? this.getKey(sortKey) : undefined;
    }

    get pName(): string {
        return this.partitionKey.name
    }

    get sName(): string | undefined {
        return this.sortKey?.name
    }

    isList(): boolean {
        return this.serialize || !this.sortKey;
    }

    get props(): GlobalSecondaryIndexProps {
        return {
            indexName: this.indexName,
            partitionKey: this.partitionKey.attribute,
            sortKey: this.sortKey ? this.sortKey.attribute : undefined,
            projectionType: this.projectionType,
            nonKeyAttributes: this.nonKeyAttributes,
            readCapacity: this.readCapacity,
            writeCapacity: this.writeCapacity
        }
    }
}