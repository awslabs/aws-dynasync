import { ProjectionType } from "aws-cdk-lib/aws-dynamodb";
import { BaseKey } from "./base";
import { Capacity } from "../types";

export class BaseIndexKey extends BaseKey {
    public readonly list:boolean
    public readonly projectionType?: ProjectionType
    public readonly nonKeyAttributes?: string[]
    public readonly readCapacity?: number
    public readonly writeCapacity?: number

    constructor(
        public readonly indexName: string,
        protected include?: string[],
        capacity?: Capacity

    ) {
        super();
        const props = include?.length ? this.handleProjection(include) : undefined;
        this.projectionType = props?.projectionType;
        this.nonKeyAttributes = props?.nonKeyAttributes;
        this.list = this.isList();
        this.readCapacity = capacity?.read;
        this.writeCapacity = capacity?.write;
    }

    protected isList(): boolean {
        return false
    }

    protected handleProjection($include:string | string[] = []): {
        projectionType:ProjectionType
        nonKeyAttributes?:string[]
    } {
        const include: string[] = Array.isArray($include) ? $include : [$include]; 
        if (include && include.length) {
            if (include.some(a => /keys?.?only/i.test(a))) {
                return { 
                    projectionType: ProjectionType.KEYS_ONLY,
                }
            }
            return {
                projectionType: ProjectionType.INCLUDE,
                nonKeyAttributes:include
            }
        }
        return {
            projectionType: ProjectionType.ALL
        }
    }
}