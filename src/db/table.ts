import { 
    BillingMode, 
    Table, 
    StreamViewType, 
    TableProps
} from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { 
    DynamoTableProps, 
    SchemaGlobal, 
    SchemaLocal, 
    SchemaTable, 
    SchemaTableInstance 
} from '../types';
import { SchemaPrimaryKey } from '../key/primary';
import { SchemaLocalIndex } from '../key/local';
import { SchemaGlobalIndex } from '../key/global';
import { capitalize } from '../util';
import { KeyInstance } from '../key/instance';
import { DbApi } from './api';
import { GraphqlApi } from 'aws-cdk-lib/aws-appsync';
import { AppSyncSchema } from '../api/schema';


export class DbTable implements SchemaTableInstance {
    readonly baseName:string = this.schemaTable.tableName;
    readonly tableName: string =  this.label ? `${this.label}\.${this.schemaTable.tableName}` : this.schemaTable.tableName;
    construct: Table
    api?: DbApi
    props: DynamoTableProps = {
        pointInTimeRecovery: true,
        ...(this.schemaTable.tableProps || {}),
    }
    localSecondaryIndexes: SchemaLocalIndex[] = this.setLocalKeys(this.schemaTable.localSecondaryIndexes)
    globalSecondaryIndexes: SchemaGlobalIndex[] = this.setGlobalKeys(this.schemaTable.globalSecondaryIndexes)
    primaryKey = new SchemaPrimaryKey(this.schemaTable.partitionKey, this.schemaTable.sortKey);
    attributes: Record<string,string> = this.setGraphAttributes(this.schemaTable.attributes || {})
    readonly auto = this.schemaTable.auto || false
    readonly scan = this.schemaTable.scan || false 
    readonly subscription = this.schemaTable.subscription || false
    readonly query = this.scan ? true : (this.schemaTable.hasOwnProperty('query') ? !!this.schemaTable.query : true)
    readonly mutation = this.auto ? true : (this.schemaTable.hasOwnProperty('mutation') ? !!this.schemaTable.mutation : true)
    
    constructor(
        public scope: Construct,
        public readonly schemaTable: SchemaTable, 
        public readonly label?:string
    ) {

        this.construct = new Table(scope, this.tableName, {
            ...this.props,
            ...this.primaryKey.keySchema,
            tableName: this.tableName,
        }); 
        if (this.globalSecondaryIndexes)
            this.globalSecondaryIndexes.forEach(ind => this.construct.addGlobalSecondaryIndex(ind.props),this);
        if (this.localSecondaryIndexes)
            this.localSecondaryIndexes.forEach(ind => this.construct.addLocalSecondaryIndex(ind.props),this);         
    }

    get pName(): string {
        return this.primaryKey.partitionKey.name
    }

    get sName(): string | undefined {
        return this.primaryKey.sortKey?.name
    }

    addApi(api:GraphqlApi, schema:AppSyncSchema): DbApi {
        this.api = new DbApi(this.scope, `${this.tableName}Api`, api, schema, this);
        return this.api;
    }

     protected setLocalKeys(keys?: (string | SchemaLocal | SchemaLocalIndex)[]): SchemaLocalIndex[] {
        if (!keys?.length) return [];
        return keys.map($key => {
            if ($key instanceof SchemaLocalIndex) return $key;
            const key = typeof $key === 'string' ? {
                sortKey: new KeyInstance($key, undefined, 'sort')
            } : $key;
            const name = key.indexName || `local${capitalize(this.tableName) + capitalize(
                typeof key.sortKey === 'string' ? key.sortKey : key.sortKey.name
            )}`
            return new SchemaLocalIndex(
                    name,
                    key.sortKey,
                    key.include
            );
        });
    }

    protected setGlobalKeys(keys?: (string | SchemaGlobal | SchemaGlobalIndex)[]): SchemaGlobalIndex[] {
        if (!keys?.length) return [];
        return keys.map($key => {
            if ($key instanceof SchemaGlobalIndex) return $key;
            const key = typeof $key === 'string' ? {
                partitionKey: new KeyInstance($key, undefined, 'partition')
            } : $key;
            let name = key.indexName || `global${capitalize(this.tableName) + capitalize(
                typeof key.partitionKey === 'string' ? key.partitionKey : key.partitionKey.name
            )}`;
            if (key.sortKey) name += capitalize(typeof key.sortKey === 'string' ? key.sortKey : key.sortKey.name);
            return new SchemaGlobalIndex(
                    name,
                    key.partitionKey,
                    key.sortKey,
                    key.list,
                    key.include,
                    key.capacity
            );
        });
    }

    protected setGraphAttributes(attrs?:string | string[] | Record<string,string>): Record<string,string> {
        if (typeof attrs === 'string') attrs = [attrs];
        let $attr:Record<string,string> = {}
        if (Array.isArray(attrs)) {
            attrs.forEach(at => {
                $attr[at] = 'string'
            });
        } else if (attrs && typeof attrs === 'object') $attr = attrs;
        return $attr;
    }
}