import { Construct } from 'constructs';
import { AppSyncSchema } from './schema';
import { getName, validateTable } from '../util';
import { DbTable } from '../db/table';
import { SchemaTable } from '../types';
import { 
    GraphqlApi, 
    ISchema,
    AuthorizationType,
    DynamoDbDataSource,
    UserPoolConfig
} from 'aws-cdk-lib/aws-appsync';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { IntermediateParams } from './schema-alpha';

export interface AppSyncStackProps {
    config: UserPoolConfig
    tables: (DbTable | SchemaTable)[]
    schemaTypes?: IntermediateParams
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
            const inst:DbTable = (table instanceof DbTable) ? table : 
                new DbTable(this.scope, table, (table as SchemaTable).prefix);
            const res = this.addTableSchema(inst);
            if (res) acc.push(res);
            return acc;
        }, [] as DbTable[]);
        this.schema.initTypes(this.props.schemaTypes);
        this.api = this.getApi(this.schema, props.config);
        this.tables = this.tables.map(table => this.addTableApi(table));
    }

    protected getApi(schema: ISchema, userPoolConfig: UserPoolConfig): GraphqlApi {
        const nm = getName(this.id, 'GraphQlApi');
        return new GraphqlApi(this.scope, nm, {
            name: nm,
            schema,
            authorizationConfig: {
                defaultAuthorization: {
                    authorizationType: AuthorizationType.USER_POOL,
                    userPoolConfig
                }
            },
            xrayEnabled: true
        });
    }

    get userPool(): IUserPool {
        return this.props.config.userPool
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