import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@auth0/nextjs-auth0";
import clientPromise from "../../lib/mongodb";
import { ObjectId } from "mongodb";

interface Upload {
  _id: ObjectId;
  parsedText?: {
    draft?: string;
    guidelines?: string;
  };
  createdAt: string;
  userSub: string;
}

interface ParsedUpload {
  _id: string;
  draftText: string;
  guidelinesText: string;
  createdAt: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const session = await getSession(req, res);
  if (!session?.user) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const uploads = (await db
      .collection<Upload>("uploads")
      .find({ userSub: session.user.sub })
      .sort({ createdAt: -1 })
      .toArray()) as Upload[];

    const parsed: ParsedUpload[] = uploads.map((upload) => ({
      _id: upload._id.toString(),
      draftText: upload.parsedText?.draft || "",
      guidelinesText: upload.parsedText?.guidelines || "",
      createdAt: upload.createdAt,
    }));

    res.status(200).json({ uploads: parsed });
  } catch (err) {
    console.error("Failed to fetch uploads:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
