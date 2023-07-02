import { Attribute, BillingMode, StreamViewType } from "aws-cdk-lib/aws-dynamodb"
import { KeyInstance } from "./key/instance"
import { Topic } from "aws-cdk-lib/aws-sns"
import { SchemaPrimaryKey } from "./key/primary"
import { SchemaGlobalIndex } from "./key/global"
import { SchemaLocalIndex } from "./key/local"
import { ResourceProps } from "aws-cdk-lib"
import { IUserPool } from "aws-cdk-lib/aws-cognito"
import { DbTable } from "./db/table"
import { Directive, IField, IIntermediateType, InterfaceType } from "@aws-cdk/aws-appsync-alpha"
import { Resolver } from "aws-cdk-lib/aws-appsync"

export interface DynasyncProps extends ResourceProps {
    userPool?: IUserPool
    tables?: (DbTable | SchemaTable)[]
    configFile?: string
    types?: GraphQlTypeList
    userPoolRegex?: string
    userPoolDeny?: boolean
}

export interface SchemaTable extends SchemaTableBase {
    partitionKey: string | KeyInstance
    sortKey?: string | KeyInstance
    attributes?: Record<string,string>
    globalSecondaryIndexes?: (string | SchemaGlobal | SchemaGlobalIndex)[]
    localSecondaryIndexes?: (string | SchemaLocal | SchemaLocalIndex)[]
    prefix?: string
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
    readonly tableName?: string;

    readonly billingMode?: BillingMode;

    readonly pointInTimeRecoveryEnabled?: boolean;

    readonly timeToLiveSpecification?: string;

    readonly streamSpecification?: StreamViewType;

    readonly alertTopic? : Topic;
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
