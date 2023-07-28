import { Attribute, BillingMode, StreamViewType, TableClass, TableEncryption, TableProps } from "aws-cdk-lib/aws-dynamodb"
import { KeyInstance } from "./key/instance"
import { SchemaPrimaryKey } from "./key/primary"
import { SchemaGlobalIndex } from "./key/global"
import { SchemaLocalIndex } from "./key/local"
import { Duration, RemovalPolicy, ResourceProps } from "aws-cdk-lib"
import { IUserPool } from "aws-cdk-lib/aws-cognito"
import { DbTable } from "./db/table"
import { Directive, IField, IIntermediateType, InterfaceType } from "@aws-cdk/aws-appsync-alpha";
import { AuthorizationMode, DomainOptions, LogConfig, Resolver } from "aws-cdk-lib/aws-appsync"
import { IKey } from "aws-cdk-lib/aws-kms"
import { IStream } from "aws-cdk-lib/aws-kinesis"

export interface DynasyncProps extends ResourceProps {
    userPool?: IUserPool
    tables?: (DbTable | SchemaTable)[]
    configFile?: string
    types?: GraphQlTypeList
    userPoolRegex?: string
    userPoolDeny?: boolean
    apiProps?: AppsyncApiProps
    tableProps?: DynamoTableProps
    auth?: AuthorizationMode[]
    deleteTablesWithStack?:boolean
}

export interface SchemaTable extends SchemaTableBase {
    partitionKey: string | KeyInstance
    sortKey?: string | KeyInstance
    attributes?: Record<string,string>
    globalSecondaryIndexes?: (string | SchemaGlobal | SchemaGlobalIndex)[]
    localSecondaryIndexes?: (string | SchemaLocal | SchemaLocalIndex)[]
    prefix?: string
    tableProps?: DynamoTableProps
}

export interface SchemaTableInstance extends Required<SchemaTableBase> {
    localSecondaryIndexes: SchemaLocalIndex[]
    globalSecondaryIndexes: SchemaGlobalIndex[]
    primaryKey: SchemaPrimaryKey
    attributes: Record<string,string>
}

interface SchemaTableBase {
    readonly tableName: string
    props?: DynamoTableProps
    scan?: boolean
    auto?: boolean
    subscription?: boolean
    query?: boolean
    mutation?: boolean
}

export interface Capacity {
    read?: number
    write?: number
}

export interface KeyAttributes {
    partitionKey: Attribute
    sortKey?: Attribute
}
export interface SchemaGlobal {
    partitionKey: string | KeyInstance
    sortKey?: string | KeyInstance
    include?: string[]
    indexName?: string
    list?:boolean
    capacity?: Capacity
}

export interface GraphQlTypeList {
    types?: IntermediateTypeList
    interfaces?: IntermediateTypeList
    inputs?: IntermediateTypeList
    unions?:  {[name:string]: (string | IIntermediateType)[]}
    enums?:  {[name:string]: string[]}
}

export interface SchemaLocal {
    sortKey: string | KeyInstance
    include?: string[]
    indexName?: string
}

export interface DynamoTableProps {
    readCapacity?: number
    writeCapacity?: number
    replicationTimeout?: Duration
    replicationRegions?: string[]
    billingMode?: BillingMode
    pointInTimeRecovery?: boolean
    tableClass?: TableClass
    encryption?: TableEncryption
    encryptionKey?: IKey
    timeToLiveAttribute?: string
    stream?: StreamViewType
    waitForReplicationToFinish?: boolean
    contributorInsightsEnabled?: boolean
    deletionProtection?: boolean
    kinesisStream?: IStream
    removalPolicy?: RemovalPolicy
}

export type DynamoAttribute = "B" | "S" | "N";

export interface DynamoAttributes {
    [ name: string ]: DynamoAttribute
}

export type SchemaObject = Record<string, string>


export type GraphType = 'id' | 'string' | 'int' | 'float' | 'boolean' |
'awsDate' | 'awsTime' | 'awsDateTime' | 'awsTimestamp' | 'awsEmail' |
'awsJson' | 'awsUrl' | 'awsPhone' | 'awsIpAddress' | 'intermediate'

export interface IntermediateTypes {
    [name:string]: IIntermediateType
}

export type IntermediateType = 'type' | 'input' | 'interface' | 'union' | 'enum';

export interface SchemaFields {
    [name:string]: IField
}

export interface IntermediateTypeBase {
    directives?: Directive[]
    interfaceTypes?: InterfaceType[]
    intermediateType?: IIntermediateType
    resolvers?: Resolver[]
}

export interface IntermediateTypeProps extends IntermediateTypeBase {
    definition: SchemaObject
}

export interface IntermediateTypeOptions extends IntermediateTypeBase {
    definition: SchemaFields
}

export interface IntermediateTypeList {
    [name:string]: IntermediateTypeProps | SchemaObject
}

export interface AppsyncApiProps {
    logConfig?: LogConfig
    xrayEnabled?: boolean
    domainName?: DomainOptions
}
