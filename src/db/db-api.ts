import { 
    Assign, 
    DynamoDbDataSource, 
    GraphqlApi, 
    KeyCondition, 
    MappingTemplate, 
    PrimaryKey, 
    Values 
} from 'aws-cdk-lib/aws-appsync';
import { Construct } from "constructs";
import { DbTable } from "./table";
import { AppSyncSchema } from '../api/schema';
import { capitalize, validateTable } from '../util';
export class DbApi {
    dataSource: DynamoDbDataSource

    constructor(
        public scope: Construct,
        public id: string,
        public api: GraphqlApi,
        public schema: AppSyncSchema,
        public table: DbTable,
    ) {
        validateTable(table);
        this.dataSource = new DynamoDbDataSource(scope, 
            `${id}-${this.table.tableName}DataSource`, {
            api, 
            name:`${this.table.tableName}DataSource`,
            table: table.construct
        });

        const usedOperations:string[] = [];
        const dataSource = this.dataSource;

        /** QUERIES */
        if (table.query) {
            if (table.scan) {
                // Get Whole Table
                this.api.createResolver(`scan${table.baseName}`, {
                    fieldName: `scan${table.baseName}`,
                    typeName: 'Query',
                    dataSource,
                    responseMappingTemplate: MappingTemplate.dynamoDbResultList(),
                    requestMappingTemplate: MappingTemplate.dynamoDbScanTable()
                });
            }

            let getName = `get${table.baseName}By${capitalize(table.pName)}`;
            if (table.sName) getName += `And${capitalize(table.sName)}`;
            if (!usedOperations.includes(getName)) {
                this.api.createResolver(getName, {
                    fieldName: getName,
                    typeName: 'Query',
                    dataSource,
                    responseMappingTemplate: MappingTemplate.dynamoDbResultItem(),
                    requestMappingTemplate: table.sName ? 
                        this.primaryTemplate(this.getPrimaryKey(table.pName, table.sName))
                        : MappingTemplate.dynamoDbGetItem(table.pName, table.pName)
                });
                usedOperations.push(getName);
            }

            if (table.sName) {
                const partitionKeyName = `list${table.baseName}By${capitalize(table.pName)}`;
                if (!usedOperations.includes(partitionKeyName)) {
                    this.api.createResolver(partitionKeyName, {
                        fieldName: partitionKeyName,
                        typeName: 'Query',
                        dataSource,
                        responseMappingTemplate: MappingTemplate.dynamoDbResultList(),
                        requestMappingTemplate: MappingTemplate.dynamoDbQuery(
                            KeyCondition.eq(table.pName, table.pName)
                        )
                    })
                    usedOperations.push(partitionKeyName);
                }
            }

            // Loop through indexes
            if (table.globalSecondaryIndexes?.length) {
                table.globalSecondaryIndexes.forEach(index => {
                    const prefix = (index.sortKey || index.list) ? 'list' : 'get';
                    const getIndexName = `${prefix}${table.baseName}By${capitalize(index.pName)}`
        
                    if (!usedOperations.includes(getIndexName)) {
                        this.api.createResolver(getIndexName, {
                            fieldName: getIndexName,
                            typeName: 'Query',
                            dataSource,
                            responseMappingTemplate: (index.sortKey || index.list) ? 
                                MappingTemplate.dynamoDbResultList() :
                                MappingTemplate.dynamoDbResultItem(),
                            requestMappingTemplate: MappingTemplate.dynamoDbQuery(
                                KeyCondition.eq(index.pName, index.pName),
                                `global${table.baseName}${index.pName}${index.sName || ''}`
                            )
                        })
                        usedOperations.push(getIndexName);
                    }
        
                    if (index.sName) {
                        const sortName = `get${table.baseName}By${capitalize(index.pName)}And${capitalize(index.sName)}`
        
                        if (!usedOperations.includes(sortName)) {
                            this.api.createResolver(sortName, {
                                fieldName:sortName,
                                typeName: 'Query',
                                dataSource,
                                responseMappingTemplate: MappingTemplate.dynamoDbResultItem(),
                                requestMappingTemplate: MappingTemplate.dynamoDbQuery(
                                    KeyCondition.eq(index.pName, index.pName)
                                        .and(KeyCondition.eq(index.sName, index.sName)),
                                    index.indexName
                                )
                            })
                            usedOperations.push(sortName);
                        }
                    }
                })

                if (table.localSecondaryIndexes?.length) {
                    table.localSecondaryIndexes.forEach(index => {
                        const localName = `get${table.baseName}By${capitalize(table.pName)}And${capitalize(index.sName)}`
        
                        if (!usedOperations.includes(localName)) {
                            this.api.createResolver(localName, {
                                fieldName:localName,
                                typeName: 'Query',
                                dataSource,
                                responseMappingTemplate: MappingTemplate.dynamoDbResultItem(),
                                requestMappingTemplate: MappingTemplate.dynamoDbQuery(
                                    KeyCondition.eq(table.pName, table.pName)
                                        .and(KeyCondition.eq(index.sName, index.sName)),
                                    index.indexName
                                )
                            })
                            usedOperations.push(localName);
                        }
                    })
                }
            }
        }

        /** MUTATIONS */
        if (table.mutation) {
            if (table.auto) {
                // Create item
                this.api.createResolver(`create${table.baseName}`, {
                    fieldName: `create${table.baseName}`,
                    typeName: 'Mutation',
                    dataSource,
                    responseMappingTemplate: MappingTemplate.dynamoDbResultItem(),
                    requestMappingTemplate: MappingTemplate.dynamoDbPutItem(
                        PrimaryKey.partition(table.pName).auto(),
                        Values.projecting('input')
                    ),            
                })
            }

            // Put item
            this.api.createResolver(`put${table.baseName}`, {
                fieldName: `put${table.baseName}`,
                typeName: 'Mutation',
                dataSource,
                responseMappingTemplate: MappingTemplate.dynamoDbResultItem(),
                requestMappingTemplate: MappingTemplate.dynamoDbPutItem(
                    this.getPrimaryKey(table.pName, table.sName),
                    Values.projecting('input')
                ),            
            })  

            // Delete item
            this.api.createResolver(`delete${table.baseName}`, {
                fieldName: `delete${table.baseName}`,
                typeName: 'Mutation',
                dataSource,
                responseMappingTemplate: MappingTemplate.dynamoDbResultItem(),
                requestMappingTemplate: this.primaryTemplate(
                    this.getPrimaryKey(table.pName, table.sName),
                    "DeleteItem"
                ),            
            })
        }

        /** SUBSCRIPTIONS */
        if (table.subscription) {
            this.api.createResolver(`on${table.baseName}Change`, {
                fieldName: `on${table.baseName}Change`,
                typeName: 'Subscription',
                dataSource,
                responseMappingTemplate: MappingTemplate.dynamoDbResultItem(),
                requestMappingTemplate: MappingTemplate.dynamoDbPutItem(
                    this.getPrimaryKey(table.pName, table.sName),
                    Values.projecting('input')
                ),            
            })  
        }
    }


    primaryTemplate(primaryKey: PrimaryKey, operation: string = "GetItem"): MappingTemplate {
        return MappingTemplate.fromString(
          `{"version": "2017-02-28", "operation": "${operation}", ${primaryKey.renderTemplate()}}`
        );
    }


    getPrimaryKey(
        partition: string,
        sort?: string,
        auto?: "partition" | "sort"
      ): PrimaryKey {
        const sortKey = sort ? this.assign(sort, auto === "sort") : undefined;
        return new PrimaryKey(
          this.assign(partition, auto === "partition"),
          sortKey
        );
    }

    assign(name: string, auto: boolean = false): Assign {
        const arg = auto ? "$util.autoId()" : `$ctx.args.${name}`;
        return new Assign(name, arg);
    }
}