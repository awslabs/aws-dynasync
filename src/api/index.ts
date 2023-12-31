import { Construct } from 'constructs';
import { AppSyncSchema } from './schema';
import { getName, validateTable } from '../util';
import { DbTable } from '../db/table';
import { SchemaTable, GraphQlTypeList, AppsyncApiProps, DynamoTableProps } from '../types';
import {
    GraphqlApi,
    ISchema,
    DynamoDbDataSource,
    AuthorizationConfig
} from 'aws-cdk-lib/aws-appsync';

export interface AppSyncStackProps {
    config: AuthorizationConfig
    tables: (DbTable | SchemaTable)[]
    schemaTypes?: GraphQlTypeList
    apiProps?: AppsyncApiProps
    tableProps?: DynamoTableProps
}

export class AppSyncStack {
    api: GraphqlApi
    schema: AppSyncSchema
    tables: DbTable[] = []
    data: DynamoDbDataSource[] = [];

    constructor(
        public scope: Construct,
        protected id: string,
        private props: AppSyncStackProps
    ) {
        this.schema = new AppSyncSchema();
        this.tables = props.tables.reduce((acc, table) => {
            let inst:DbTable
            if (table instanceof DbTable) {
                if (this.props.tableProps) throw new Error(`Cannot pass additional table props when using already-instantiated DbTable instance for table ${table.tableName}`);
                inst = table;
            } else {
                if (props.tableProps) table.tableProps = {
                    ...table.tableProps || {},
                    ...props.tableProps
                }
                inst = new DbTable(this.scope, table, (table as SchemaTable).prefix);
            }
            const res = this.addTableSchema(inst);
            if (res) acc.push(res);
            return acc;
        }, [] as DbTable[]);
        this.schema.initTypes(this.props.schemaTypes);
        this.api = this.getApi(this.schema, props.config, props.apiProps);
        this.tables = this.tables.map(table => this.addTableApi(table));
    }

    get config(): AuthorizationConfig {
        return this.props.config;
    }

    protected getApi(schema: ISchema, authorizationConfig: AuthorizationConfig, apiProps?: AppsyncApiProps): GraphqlApi {
        const nm = getName(this.id, 'GraphQlApi');
        return new GraphqlApi(this.scope, nm, {
            name: nm,
            schema,
            authorizationConfig,
            xrayEnabled: true,
            ...(apiProps || {})
        });
    }

    addTableSchema($table:DbTable): DbTable | false {
        const table = this.schema.addTable($table);
        if (table) this.tables.push(table);
        return table;
    }

    addTableApi(table: DbTable): DbTable {
        table.addApi(this.api, this.schema);
        return table;
    }

    validateTable(table: DbTable) {
        return validateTable(table);
    }
}
