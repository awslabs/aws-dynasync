import { RemovalPolicy, Resource } from "aws-cdk-lib";
import { Construct } from "constructs";
import { DynasyncProps } from "./types";
import { readFileSync, existsSync  } from 'fs';
import { extname, join } from "path";
import { DbTable } from "./db/table";
import { AppSyncStack } from "./api";
import { AuthorizationConfig, AuthorizationMode, AuthorizationType, GraphqlApi, UserPoolDefaultAction } from "aws-cdk-lib/aws-appsync";
import { UserPool } from "aws-cdk-lib/aws-cognito";

export class Dynasync extends Resource {
    public readonly tables: DbTable[];
    public readonly appsync: AppSyncStack;
    protected $config: DynasyncProps = {
        tables:[],
        types: {}
    }

    public static init(scope:Construct, id: string, props?:DynasyncProps): Dynasync {
        return new Dynasync(scope,id,props);
    }

    /**
     * {@link GraphqlApi} created by Dynasync
     */
    get api(): GraphqlApi {
        return this.appsync.api;
    }

    constructor(
        protected scope: Construct,
        protected id: string,
        protected $props: DynasyncProps = {
            tables:[],
            types: {}
        }
    ) {
        super(scope, id, $props);
        if ($props.configFile) {
            if (!existsSync($props.configFile)) throw new Error(`Config file ${$props.configFile} does not exist`);
            if (!/json/.test(extname($props.configFile)))  throw new Error(`File at ${$props.configFile} is not JSON file`);
        }
        const configFilePath = $props.configFile || join(process.cwd(), 'dynasync.json');
        if (existsSync(configFilePath)) {
            this.$config = JSON.parse(readFileSync(configFilePath).toString());
        }
        const properties = this.props;
        if (!properties.tables?.length) {
            throw new Error("No tables provided. Cannot build API and Database without tables. Please configure parameters or provide 'dynasync.json' config file");
        }
        let defaultAuthorization: AuthorizationMode | undefined;
        if (properties.userPool || !properties.auth?.length) {
            defaultAuthorization = this.getUserPoolAuthMode(properties);
        } else {
            defaultAuthorization = (properties.auth || []).shift();
        }
        let additionalAuthorizationModes: AuthorizationMode[] | undefined = properties.auth?.length ?
            properties.auth : undefined;
        const config: AuthorizationConfig = {
            defaultAuthorization,
            additionalAuthorizationModes
        }
        if (properties.deleteTablesWithStack) {
            if (!properties.tableProps) properties.tableProps = {};
            properties.tableProps.removalPolicy = RemovalPolicy.DESTROY;
        }
        this.appsync = new AppSyncStack(scope, `${id}AppSyncStack`, {
            config,
            tables: properties.tables || [],
            schemaTypes: properties.types || {},
            apiProps: properties.apiProps,
            tableProps: properties.tableProps
        });
        this.tables = this.appsync.tables;
    }

    get props(): DynasyncProps {
        return this.mergeProps(this.$config, this.$props);
    }

    addToSchema(str:string): string {
        if (!this.appsync) throw new Error('Cannot add to schema until after Schema is created');
        this.appsync.schema.root.addToSchema(str);
        return this.appsync.schema.root.getDefinition(this.appsync.api);
    }

    private mergeProps(config: DynasyncProps, props: DynasyncProps): DynasyncProps {
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

    private getUserPoolAuthMode(properties: DynasyncProps): AuthorizationMode {
        return {
            authorizationType: AuthorizationType.USER_POOL,
            userPoolConfig: {
                userPool: properties.userPool || new UserPool(this.scope, `${this.id}UserPool`),
                appIdClientRegex: properties.userPoolRegex,
                defaultAction: properties.userPoolDeny ? UserPoolDefaultAction.DENY : UserPoolDefaultAction.ALLOW
            }
        }
    }
}
