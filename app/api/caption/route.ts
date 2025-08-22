import { type NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function POST(request: NextRequest) {
	try {
		// Accept JSON body with url
		const { url } = await request.json();
		if (!url || typeof url !== "string") {
			return NextResponse.json({ error: "No URL provided" }, { status: 400 });
		}

		// Save the URL to a file
		await kv.set("backendUrl", url);

		// Respond with confirmation and the exported URL
		return NextResponse.json({
			success: true,
			message: "URL received and exported for later use.",
			url: url,
		});
	} catch (error) {
		console.error("Caption API Error:", error);
		return NextResponse.json({ error: "Internal server error. Please try again." }, { status: 500 });
	}
}

export async function GET(request: NextRequest) {
	try {
		// Retrieve the URL from the file
		const url = await kv.get<string>("backendUrl");
		if (!url) {
			return NextResponse.json({ error: "No URL found" }, { status: 404 });
		}

		// Respond with the exported URL
		return NextResponse.json({
			success: true,
			url: url,
		});
	} catch (error) {
		console.error("Caption API Error:", error);
		return NextResponse.json({ error: "Internal server error. Please try again." }, { status: 500 });
	}
}
