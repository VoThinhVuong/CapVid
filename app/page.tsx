"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Upload, Video, Send, Bot, User, Sparkles, Download, Copy } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface CaptionData {
  filename: string
  fileSize: number
  duration: string
  captionCount: number
  captions: Array<{
    start: string
    end: string
    text: string
  }>
  formats: {
    srt: string
    vtt: string
    json: Array<{
      start: string
      end: string
      text: string
    }>
  }
  confidence: number
  language: string
}

export default function VideoCaptioningApp() {
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! Upload a video file and I'll help you generate accurate captions using advanced AI technology.",
      timestamp: new Date(),
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [captionData, setCaptionData] = useState<CaptionData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("video/")) {
      setSelectedVideo(file)
      const url = URL.createObjectURL(file)
      setVideoUrl(url)
      setCaptionData(null) // Reset previous captions

      // Add message about video upload
      const newMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Great! I've received your video "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)} MB). Click "Generate Captions" to start the AI processing, or ask me any questions about the captioning process.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, newMessage])
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file && file.type.startsWith("video/")) {
      setSelectedVideo(file)
      const url = URL.createObjectURL(file)
      setVideoUrl(url)
      setCaptionData(null) // Reset previous captions

      const newMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Perfect! I've received your video "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)} MB). Ready to generate captions when you are!`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, newMessage])
    }
  }

  const generateCaptions = async () => {
    if (!selectedVideo) return

    setIsProcessing(true)

    // Add processing message
    const processingMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: "🔄 Processing your video with AI... This may take a few moments depending on the file size.",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, processingMessage])

    try {
      // Create FormData and append the video file
      const formData = new FormData()
      formData.append("video", selectedVideo)

      // Call the API
      const response = await fetch("/api/caption", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setCaptionData(result.data)

        // Add success message with caption preview
        const successMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `✅ Captions generated successfully!\n\n📊 **Results:**\n• File: ${result.data.filename}\n• Duration: ${result.data.duration}\n• Captions: ${result.data.captionCount} segments\n• Confidence: ${(result.data.confidence * 100).toFixed(1)}%\n• Language: ${result.data.language}\n\n📝 **Preview:**\n${result.data.captions
            .slice(0, 2)
            .map((cap) => `${cap.start} --> ${cap.end}\n${cap.text}`)
            .join("\n\n")}\n\nYou can now download the captions in SRT, VTT, or JSON format using the buttons below!`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, successMessage])
      } else {
        // Add error message
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `❌ Error: ${result.error}\n\nPlease try again or contact support if the issue persists.`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } catch (error) {
      console.error("Error generating captions:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "❌ An unexpected error occurred while processing your video. Please check your connection and try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadCaptions = (format: "srt" | "vtt" | "json") => {
    if (!captionData) return

    let content: string
    let filename: string
    let mimeType: string

    switch (format) {
      case "srt":
        content = captionData.formats.srt
        filename = `${captionData.filename.replace(/\.[^/.]+$/, "")}.srt`
        mimeType = "text/plain"
        break
      case "vtt":
        content = captionData.formats.vtt
        filename = `${captionData.filename.replace(/\.[^/.]+$/, "")}.vtt`
        mimeType = "text/vtt"
        break
      case "json":
        content = JSON.stringify(captionData.formats.json, null, 2)
        filename = `${captionData.filename.replace(/\.[^/.]+$/, "")}.json`
        mimeType = "application/json"
        break
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    // Add download confirmation message
    const downloadMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: `📥 Downloaded ${filename} successfully! The file has been saved to your downloads folder.`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, downloadMessage])
  }

  const copyCaptions = async (format: "srt" | "vtt" | "json") => {
    if (!captionData) return

    let content: string
    switch (format) {
      case "srt":
        content = captionData.formats.srt
        break
      case "vtt":
        content = captionData.formats.vtt
        break
      case "json":
        content = JSON.stringify(captionData.formats.json, null, 2)
        break
    }

    try {
      await navigator.clipboard.writeText(content)
      const copyMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `📋 ${format.toUpperCase()} captions copied to clipboard!`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, copyMessage])
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
    }
  }

  const sendMessage = () => {
    if (!inputMessage.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I can help you with that! What specific aspect of video captioning would you like to know more about?",
        "Great question! The AI uses advanced speech recognition and natural language processing to generate accurate captions.",
        "I support various video formats including MP4, AVI, MOV, and WebM. The captions can be exported in SRT, VTT, or JSON format.",
        "The processing time depends on video length, but typically takes 1-3 minutes for a 10-minute video.",
        "You can download the captions in multiple formats or copy them directly to your clipboard for easy use.",
      ]

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                CaptionAI Pro
              </h1>
              <p className="text-sm text-gray-600">Professional Video Captioning with AI</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Video Upload Section */}
          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Video className="h-5 w-5 text-blue-600" />
                Video Upload
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Area */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">Drop your video here or click to browse</p>
                <p className="text-sm text-gray-500">Supports MP4, AVI, MOV, WebM (Max 500MB)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
              </div>

              {/* Video Preview */}
              {videoUrl && (
                <div className="space-y-4">
                  <video
                    src={videoUrl}
                    controls
                    autoPlay
                    muted
                    className="w-full rounded-lg shadow-md"
                    style={{ maxHeight: "300px" }}
                  />
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{selectedVideo?.name}</p>
                      <p className="text-sm text-gray-500">
                        {selectedVideo && `${(selectedVideo.size / 1024 / 1024).toFixed(1)} MB`}
                      </p>
                    </div>
                    <Button
                      onClick={generateCaptions}
                      disabled={isProcessing}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      {isProcessing ? "Processing..." : "Generate Captions"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Caption Download Section */}
              {captionData && (
                <Card className="bg-green-50 border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-green-800">Captions Ready!</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        onClick={() => downloadCaptions("srt")}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        SRT
                      </Button>
                      <Button
                        onClick={() => downloadCaptions("vtt")}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        VTT
                      </Button>
                      <Button
                        onClick={() => downloadCaptions("json")}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        JSON
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        onClick={() => copyCaptions("srt")}
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        Copy SRT
                      </Button>
                      <Button
                        onClick={() => copyCaptions("vtt")}
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        Copy VTT
                      </Button>
                      <Button
                        onClick={() => copyCaptions("json")}
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        Copy JSON
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Chat Section */}
          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Bot className="h-5 w-5 text-indigo-600" />
                AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col h-[500px]">
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {message.role === "assistant" && (
                          <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">{message.timestamp.toLocaleTimeString()}</p>
                        </div>
                        {message.role === "user" && (
                          <div className="p-2 bg-blue-600 rounded-full">
                            <User className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t bg-gray-50/50">
                  <div className="flex gap-2">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Ask about captioning, formats, or processing..."
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      className="flex-1"
                    />
                    <Button
                      onClick={sendMessage}
                      size="icon"
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="text-center p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-4">
              <Sparkles className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">AI-Powered Accuracy</h3>
            <p className="text-gray-600 text-sm">
              Advanced speech recognition with 95%+ accuracy across multiple languages
            </p>
          </Card>

          <Card className="text-center p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <div className="p-3 bg-indigo-100 rounded-full w-fit mx-auto mb-4">
              <Video className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Multiple Formats</h3>
            <p className="text-gray-600 text-sm">Export captions in SRT, VTT, WebVTT, and JSON formats</p>
          </Card>

          <Card className="text-center p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto mb-4">
              <Bot className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Real-time Processing</h3>
            <p className="text-gray-600 text-sm">Fast processing with real-time progress updates and instant results</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
