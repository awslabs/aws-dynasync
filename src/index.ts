import { Resource } from "aws-cdk-lib";
import { Construct } from "constructs";
import { DynaSyncProps } from "./types";
import { readFileSync, existsSync  } from 'fs';
import { extname, join } from "path";
import { DbTable } from "./db/table";
import { AppSyncStack } from "./api";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { UserPoolDefaultAction } from "aws-cdk-lib/aws-appsync";

export class DynaSync extends Resource {
    public readonly tables: DbTable[];
    public readonly appsync: AppSyncStack;
    protected $config: DynaSyncProps = {
        tables:[],
        types: {}
    }
    constructor(
        protected scope: Construct, 
        protected id: string, 
        protected $props: DynaSyncProps = {
            tables:[],
            types: {}
        }
    ) {
        super(scope, id, $props);
        if ($props.configFile) {
            if (!existsSync($props.configFile)) throw new Error(`Config file ${$props.configFile} does not exist`);
            if (!/json/.test(extname($props.configFile)))  throw new Error(`File at ${$props.configFile} is not JSON file`);
        }
        const configFilePath = $props.configFile || join(process.cwd(), 'tables.json');
        if (existsSync(configFilePath)) {
            this.$config = JSON.parse(readFileSync(configFilePath).toString());
        }
        const properties = this.props;
        const userPool =  properties.userPool || new UserPool(scope, `${id}UserPool`);
        this.appsync = new AppSyncStack(scope, `${id}AppSyncStack`, {
            config: {
                userPool,
                appIdClientRegex: properties.userPoolRegex,
                defaultAction: properties.userPoolDeny ? UserPoolDefaultAction.DENY : UserPoolDefaultAction.ALLOW
            },
            tables: properties.tables || [],
            schemaTypes: properties.types || {},
        });
        this.tables = this.appsync.tables;
    }

    get props(): DynaSyncProps {
        return this.mergeProps(this.$config, this.$props);
    }

    addToSchema(str:string): string {
        if (!this.appsync) throw new Error('Cannot add to schema until after Schema is created');
        this.appsync.schema.root.addToSchema(str);
        return this.appsync.schema.root.getDefinition(this.appsync.api);
    }

    private mergeProps(config: DynaSyncProps, props: DynaSyncProps): DynaSyncProps {
        return {
            ...config,
            ...props,
            tables: [
                ...(config.tables || []),
                ...(props.tables || []),
            ],
            types: {
                enums: {
                    ...(config.types?.enums || {}),
                    ...(props.types?.enums || {})
                },
                unions: {
                    ...(config.types?.unions || {}),
                    ...(props.types?.unions || {})
                },
                types: {
                    ...(config.types?.types || {}),
                    ...(props.types?.types || {})
                },
                interfaces: {
                    ...(config.types?.interfaces || {}),
                    ...(props.types?.interfaces || {})
                },
                inputs: {
                    ...(config.types?.inputs || {}),
                    ...(props.types?.inputs || {})
                }
            }
        }
    }
}