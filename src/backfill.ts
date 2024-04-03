import { FidRequest } from "@farcaster/hub-nodejs";
import { Presets, SingleBar } from "cli-progress";
import "dotenv/config";

import {
  castAddBatcher,
  linkAddBatcher,
  reactionAddBatcher,
  userDataAddBatcher,
  verificationAddBatcher,
} from "./lib/batch.js";
import { client } from "./lib/client.js";
import { saveCurrentEventId } from "./lib/event.js";
import { log } from "./lib/logger.js";
import { getAllCastsByFid, getAllReactionsByFid } from "./lib/paginate.js";
import { checkMessages } from "./lib/utils.js";

const progressBar = new SingleBar({ fps: 1 }, Presets.shades_classic);

/**
 * Backfill the database with data from a hub. This may take a while.
 */
export async function backfill({
  maxFid,
}: {
  maxFid?: number | undefined;
}): Promise<void> {
  // Save the current event ID so we can start from there after backfilling
  await saveCurrentEventId();

  log.info("Backfilling...");
  const startTime = new Date().getTime();
  const allFids = await getAllFids();
  progressBar.start(maxFid || allFids.length, allFids[0]);

  for (const fid of allFids) {
    if (maxFid && fid > maxFid) {
      log.warn(`Reached max FID ${maxFid}, stopping backfill`);
      break;
    }

    await getFullProfileFromHub(fid)
      .then((profile) => {
        profile.casts.forEach((msg) => castAddBatcher.add(msg));
        profile.links.forEach((msg) => linkAddBatcher.add(msg));
        profile.reactions.forEach((msg) => reactionAddBatcher.add(msg));
        profile.userData.forEach((msg) => userDataAddBatcher.add(msg));
        profile.verifications.forEach((msg) => verificationAddBatcher.add(msg));
      })
      .catch((err) => {
        log.error(err, `Error getting profile for FID ${fid}`);
      });

    progressBar.increment();
  }

  const endTime = new Date().getTime();
  const elapsedMilliseconds = endTime - startTime;
  const elapsedMinutes = elapsedMilliseconds / 60000;
  log.info(`Done backfilling in ${elapsedMinutes} minutes`);
  progressBar.stop();
}

/**
 * Index all messages from a profile
 * @param fid Farcaster ID
 */
async function getFullProfileFromHub(_fid: number) {
  const fid = FidRequest.create({ fid: _fid });

  const [casts, reactions, links, userData, verifications] = await Promise.all([
    getAllCastsByFid(fid),
    getAllReactionsByFid(fid),
    client.getLinksByFid({ ...fid, reverse: true }),
    client.getUserDataByFid(fid),
    client.getVerificationsByFid(fid),
  ]);

  return {
    casts,
    reactions,
    links: checkMessages(links, _fid),
    userData: checkMessages(userData, _fid),
    verifications: checkMessages(verifications, _fid),
  };
}

/**
 * Get all fids
 * @returns array of fids
 */
async function getAllFids(): Promise<ReadonlyArray<number>> {
  const maxFidResult = await client.getFids({
    pageSize: 1,
    reverse: true,
  });

  if (maxFidResult.isErr()) {
    throw new Error("Unable to backfill", { cause: maxFidResult.error });
  }

  const maxFid = maxFidResult.value.fids[0];
  return Array.from({ length: Number(maxFid) }, (_, i) => i + 1);
}
