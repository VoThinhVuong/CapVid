import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const videoFile = formData.get("video") as File

    if (!videoFile) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 })
    }

    // Validate file type
    if (!videoFile.type.startsWith("video/")) {
      return NextResponse.json({ error: "Invalid file type. Please upload a video file." }, { status: 400 })
    }

    // Validate file size (500MB limit)
    const maxSize = 500 * 1024 * 1024 // 500MB in bytes
    if (videoFile.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 500MB." }, { status: 400 })
    }

    // Simulate processing time based on file size
    const processingTime = Math.min(3000 + (videoFile.size / 1024 / 1024) * 100, 10000)
    await new Promise((resolve) => setTimeout(resolve, processingTime))

    // Mock caption data - in a real implementation, this would come from your AI service
    const mockCaptions = [
      {
        start: "00:00:01,000",
        end: "00:00:05,000",
        text: "Welcome to our presentation on artificial intelligence and machine learning.",
      },
      {
        start: "00:00:06,000",
        end: "00:00:10,000",
        text: "Today we'll explore the latest developments in natural language processing.",
      },
      {
        start: "00:00:11,000",
        end: "00:00:15,000",
        text: "These technologies are revolutionizing how we interact with computers.",
      },
      {
        start: "00:00:16,000",
        end: "00:00:20,000",
        text: "Let's dive into the technical details and practical applications.",
      },
    ]

    // Generate SRT format
    const srtContent = mockCaptions
      .map((caption, index) => {
        return `${index + 1}\n${caption.start} --> ${caption.end}\n${caption.text}\n`
      })
      .join("\n")

    // Generate VTT format
    const vttContent = `WEBVTT\n\n${mockCaptions
      .map((caption) => {
        const vttStart = caption.start.replace(",", ".")
        const vttEnd = caption.end.replace(",", ".")
        return `${vttStart} --> ${vttEnd}\n${caption.text}`
      })
      .join("\n\n")}`

    return NextResponse.json({
      success: true,
      message: `Captions generated successfully for "${videoFile.name}"`,
      data: {
        filename: videoFile.name,
        fileSize: videoFile.size,
        duration: "00:00:20", // Mock duration
        captionCount: mockCaptions.length,
        captions: mockCaptions,
        formats: {
          srt: srtContent,
          vtt: vttContent,
          json: mockCaptions,
        },
        confidence: 0.95, // Mock confidence score
        language: "en-US", // Mock detected language
      },
    })
  } catch (error) {
    console.error("Caption API Error:", error)
    return NextResponse.json({ error: "Internal server error. Please try again." }, { status: 500 })
  }
}
