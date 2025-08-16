import { type NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const urlFilePath = path.resolve(process.cwd(), "saved_url.txt");

export async function POST(request: NextRequest) {
	try {
		// Accept JSON body with url
		const { url } = await request.json();
		if (!url || typeof url !== "string") {
			return NextResponse.json({ error: "No URL provided" }, { status: 400 });
		}

		// Save the URL to a file
		fs.writeFileSync(urlFilePath, url, "utf8");

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

export async function GET() {
	let url = "";
	if (fs.existsSync(urlFilePath)) {
		url = fs.readFileSync(urlFilePath, "utf8");
	}
	return NextResponse.json({ url });
}
