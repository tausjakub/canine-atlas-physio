import {gate} from './gate.mjs';
import assetSizes from '../dist/private-asset-sizes.json';
export default {async fetch(request,env){return gate(request,env,request=>env.ASSETS.fetch(request),{assetSizes});}};
