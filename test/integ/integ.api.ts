import { App, Stack } from 'aws-cdk-lib';
import { Dynasync } from '../../src'; 
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import { pathToJson, integPassedTypes } from '../data';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { RequireApproval } from 'aws-cdk-lib/cloud-assembly-schema';

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
}

const app = new App();
const stack = new Stack(app, 'integ-schema-sync-stack', {env});
const userPool = new UserPool(stack, "UserPool", {
  userPoolName: 'SyncPool'
});


const sync = new Dynasync(stack, 'DynasyncConstruct', {
  userPool,
  configFile: pathToJson,
  ...integPassedTypes
});
sync.addToSchema('union CatAndFish = Cat | Fish');

const test = new IntegTest(app, 'integ-schema-sync', {
  testCases: [stack],
  diffAssets: true,
  stackUpdateWorkflow: true,
  cdkCommandOptions: {
    deploy: {
      args: {
        requireApproval: RequireApproval.NEVER,
        json: true,
      },
    },
    destroy: {
      args: {
        force: true,
      },
    },
  }
});