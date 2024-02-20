import { HubEvent, HubEventType, MessageType } from '@farcaster/hub-nodejs'

import { insertEvent } from '../api/event.js'
import {
  castAddBatcher,
  castRemoveBatcher,
  linkAddBatcher,
  linkRemoveBatcher,
  reactionAddBatcher,
  reactionRemoveBatcher,
  userDataAddBatcher,
  verificationAddBatcher,
  verificationRemoveBatcher,
} from './batch.js'
import { client } from './client.js'
import { log } from './logger.js'

/**
 * Update the database based on the event type
 * @param event Hub event in JSON format
 */
export async function handleEvent(event: HubEvent) {
  // Handle each event type: MERGE_MESSAGE, PRUNE_MESSAGE, REVOKE_MESSAGE (3), MERGE_ID_REGISTRY_EVENT (4), MERGE_NAME_REGISTRY_EVENT (5)
  if (event.type === HubEventType.MERGE_MESSAGE) {
    event.mergeMessageBody?.message?.data?.type
    event.mergeMessageBody!
    const msg = event.mergeMessageBody!.message!
    const msgType = event.mergeMessageBody!.message!.data!.type

    if (msgType === MessageType.CAST_ADD) {
      castAddBatcher.add(msg)
    } else if (msgType === MessageType.CAST_REMOVE) {
      castRemoveBatcher.add(msg)
    } else if (msgType === MessageType.VERIFICATION_ADD_ETH_ADDRESS) {
      verificationAddBatcher.add(msg)
    } else if (msgType === MessageType.VERIFICATION_REMOVE) {
      verificationRemoveBatcher.add(msg)
    } else if (msgType === MessageType.USER_DATA_ADD) {
      userDataAddBatcher.add(msg)
    } else if (msgType === MessageType.REACTION_ADD) {
      reactionAddBatcher.add(msg)
    } else if (msgType === MessageType.REACTION_REMOVE) {
      reactionRemoveBatcher.add(msg)
    } else if (msgType === MessageType.LINK_ADD) {
      linkAddBatcher.add(msg)
    } else if (msgType === MessageType.LINK_REMOVE) {
      linkRemoveBatcher.add(msg)
    }
  } else if (event.type === HubEventType.PRUNE_MESSAGE) {
    // TODO: Mark the relevant row as `pruned` in the db but don't delete it
    // Not important right now because I don't want to prune data for my applications
  } else if (event.type === HubEventType.REVOKE_MESSAGE) {
    // Events are emitted when a signer that was used to create a message is removed
    // TODO: handle revoking messages
  } else if (event.type === HubEventType.MERGE_ON_CHAIN_EVENT) {
    // TODO: handle onchain events
  } else {
    log.debug('UNHANDLED_HUB_EVENT', event.id)
  }
}

export async function saveCurrentEventId() {
  let triggered = false

  const result = await client.subscribe({
    eventTypes: [0, 1, 2, 3, 6, 9],
  })

  if (result.isErr()) {
    log.error(result.error, 'Error starting stream')
    return
  }

  result.match(
    (stream) => {
      stream.on('data', async (e: HubEvent) => {
        if (triggered) return

        triggered = true

        // Save the latest event ID to the database so we can resume from here
        await insertEvent(e.id)
        stream.cancel()
      })
    },
    (e) => {
      log.error(e, 'Error streaming data.')
    }
  )
}