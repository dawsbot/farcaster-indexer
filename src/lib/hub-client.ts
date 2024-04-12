import {
  getInsecureHubRpcClient,
  getSSLHubRpcClient,
} from '@farcaster/hub-nodejs'
import { log } from './logger.js'

const HUB_RPC = process.env.HUB_RPC

if (!HUB_RPC) {
  throw new Error('HUB_RPC env variable is not set')
}

// grpc endpoint does not include http nor https
const HUB_SSL = !HUB_RPC.startsWith('http')
export const hubClient = HUB_SSL
  ? getSSLHubRpcClient(HUB_RPC)
  : getInsecureHubRpcClient(HUB_RPC)

/**
 * Requires that HUB_RPC returns info
 */
export const validateHubClient = async (): Promise<void> => {
  const infoResult = await hubClient.getInfo({ dbStats: false })
  if (infoResult.isErr()) {
    const errorMessage = `Error connecting to HUB_RPC. Please check "${HUB_RPC}"`
    log.error(infoResult.error, errorMessage)
    process.exit(1)
  }
}
