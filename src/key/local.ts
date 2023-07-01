import { KeyInstance } from "./instance";
import { BaseIndexKey } from "./index-base";
import { LocalSecondaryIndexProps } from "aws-cdk-lib/aws-dynamodb";

export class SchemaLocalIndex extends BaseIndexKey {
    sortKey: KeyInstance

    constructor(
        public readonly indexName: string,
        sortKey: string | KeyInstance,
        include?: string[]
    ) {
        super(indexName, include);
        this.sortKey = this.getKey(sortKey);
    }

    get sName(): string {
        return this.sortKey.name
    }

    get props(): LocalSecondaryIndexProps {
        return {
            indexName: this.indexName,
            sortKey: this.sortKey.attribute,
            projectionType: this.projectionType,
            nonKeyAttributes: this.nonKeyAttributes
        }
    }
}