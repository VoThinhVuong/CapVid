"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { askGemini } from "@/lib/geminiService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Upload, Video, Send, Bot, User, Sparkles, ImageIcon, Check } from "lucide-react"
import { getVideoCaption, getVideoContext, getImageCaption } from "@/lib/vidcapService"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

type Mode = "video" | "image"

interface ProcessingSteps {
  videoMotion: boolean
  keyFrames: boolean
  audioTranscription: boolean
  captionGenerated: boolean
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("video")
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [imageUrl, setImageUrl] = useState<string>("")
  const [context, setContext] = useState<string>("")
  // Separate chat histories for each mode
  const [videoMessages, setVideoMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! Upload a video file and I'll help you generate accurate captions, or switch to Image VQA mode to ask questions about images using advanced AI technology.",
      timestamp: new Date(),
    },
  ])
  const [imageMessages, setImageMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! Upload an image and ask me questions about it. I can describe what I see, answer specific questions, and provide detailed analysis.",
      timestamp: new Date(),
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [imgCaptionData, setImgCaptionData] = useState<string>("")
  const [vidCaptionData, setVidCaptionData] = useState<string>("")
  const [processingSteps, setProcessingSteps] = useState<ProcessingSteps>({
    videoMotion: false,
    keyFrames: false,
    audioTranscription: false,
    captionGenerated: false,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Helper to get/set messages based on mode
  const messages = mode === "video" ? videoMessages : imageMessages
  const setMessages = mode === "video" ? setVideoMessages : setImageMessages

  const resetProcessingSteps = () => {
    setProcessingSteps({
      videoMotion: false,
      keyFrames: false,
      audioTranscription: false,
      captionGenerated: false,
    })
  }

  const handleModeSwitch = (newMode: Mode) => {
    setMode(newMode)
    // Reset state when switching modes
    setIsProcessing(false)
    resetProcessingSteps()

    // Add a welcome message to the new mode's chat history
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content:
        newMode === "video"
          ? "Switched to Video Captioning mode! Upload a video file and I'll help you generate accurate captions using advanced AI technology."
          : "Switched to Image VQA mode! Upload an image and ask me questions about it. I can describe what I see, answer specific questions, and provide detailed analysis.",
      timestamp: new Date(),
    }
    if (newMode === "video") {
      setVideoMessages((prev) => [...prev])
    } else {
      setImageMessages((prev) => [...prev])
    }
  }

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("video/")) {
      setSelectedVideo(file)
      const url = URL.createObjectURL(file)
      setVideoUrl(url)
      resetProcessingSteps() // Reset checkboxes when new video is uploaded

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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setSelectedImage(file)
      const url = URL.createObjectURL(file)
      setImageUrl(url)
      resetProcessingSteps() // Reset checkboxes when new image is uploaded

      // Add message about image upload
      const newMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Perfect! I've received your image "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)} MB). I can see the image now. Feel free to ask me questions about what I see, or I can provide a general description of the image.`,
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

    if (mode === "video" && file && file.type.startsWith("video/")) {
      setSelectedVideo(file)
      const url = URL.createObjectURL(file)
      setVideoUrl(url)
      resetProcessingSteps() // Reset checkboxes when new video is dropped

      const newMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Perfect! I've received your video "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)} MB). Ready to generate captions when you are!`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, newMessage])
    } else if (mode === "image" && file && file.type.startsWith("image/")) {
      setSelectedImage(file)
      const url = URL.createObjectURL(file)
      setImageUrl(url)
      resetProcessingSteps() // Reset checkboxes when new image is dropped

      const newMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Excellent! I've received your image "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)} MB). I can analyze the image now. What would you like to know about it?`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, newMessage])
    }
  }

  const generateCaptions = async () => {
    if (!selectedVideo && !selectedImage) return

    setIsProcessing(true)
    resetProcessingSteps() // Reset all checkboxes at start

    // Add processing message
    const processingMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content:
        mode === "video"
          ? "🔄 Processing your video with AI... This may take a few moments depending on the file size."
          : "🔄 Processing your image with AI... This may take a few moments.",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, processingMessage])

    try {
      // Simulate processing steps with 1s delays
      if (mode === "video") {
        // Step 1: Video motion extracted
        setTimeout(() => {
          setProcessingSteps((prev) => ({ ...prev, videoMotion: true }))
        }, 1000)

        // Step 2: Key frames extracted
        setTimeout(() => {
          setProcessingSteps((prev) => ({ ...prev, keyFrames: true }))
        }, 2000)

        // Step 3: Audio transcription extracted
        setTimeout(() => {
          setProcessingSteps((prev) => ({ ...prev, audioTranscription: true }))
        }, 3000)

        // Step 4: Caption generated
        setTimeout(() => {
          setProcessingSteps((prev) => ({ ...prev, captionGenerated: true }))
        }, 4000)
      } else {
        // For image mode, we'll use different steps but same timing
        setTimeout(() => {
          setProcessingSteps((prev) => ({ ...prev, videoMotion: true }))
        }, 1000)

        setTimeout(() => {
          setProcessingSteps((prev) => ({ ...prev, keyFrames: true }))
        }, 2000)

        setTimeout(() => {
          setProcessingSteps((prev) => ({ ...prev, audioTranscription: true }))
        }, 3000)

        setTimeout(() => {
          setProcessingSteps((prev) => ({ ...prev, captionGenerated: true }))
        }, 4000)
      }

      if (mode === "video" && selectedVideo) {
        const caption = await getVideoCaption(selectedVideo)
        const context = await getVideoContext(selectedVideo)

        setVidCaptionData(caption)
        setContext(context)

        const successMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: vidCaptionData,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, successMessage])
      } else if (mode === "image" && selectedImage) {
        const caption = await getImageCaption(selectedImage)

        setImgCaptionData(caption)

        const successMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: imgCaptionData,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, successMessage])
      }
    } catch (error) {
      console.error("Error generating captions:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "❌ An unexpected error occurred while processing your media. Please check your connection and try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")

    // Show a temporary assistant message while waiting for Gemini
    const tempId = (Date.now() + 1).toString()
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        role: "assistant",
        content: "Thinking...",
        timestamp: new Date(),
      },
    ])

    try {
      let prompt = inputMessage
      if (mode === "image" && !selectedImage) {
        prompt = "[No image uploaded] " + inputMessage
      }
      // Optionally, you can add more context to the prompt here

      let geminiResponse: string

      if (mode === "video") {
        geminiResponse = await askGemini(prompt, context, vidCaptionData, mode)
      } else {
        geminiResponse = await askGemini(prompt, null, imgCaptionData, mode)
      }

      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempId ? { ...msg, content: geminiResponse, timestamp: new Date() } : msg)),
      )
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? { ...msg, content: "❌ Error: Failed to get response from Gemini API.", timestamp: new Date() }
            : msg,
        ),
      )
    }
  }

  // Auto-scroll chat to bottom when new messages arrive with smooth animation
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth",
        })
      }
    }
  }, [messages])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  CaptionAI Pro
                </h1>
                <p className="text-sm text-gray-600">Professional AI-Powered Media Analysis</p>
              </div>
            </div>

            {/* Mode Switch Buttons */}
            <div className="flex items-center gap-2 bg-white/90 rounded-lg p-1 shadow-sm">
              <Button
                onClick={() => handleModeSwitch("video")}
                variant={mode === "video" ? "default" : "ghost"}
                size="sm"
                className={`flex items-center gap-2 ${
                  mode === "video"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Video className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => handleModeSwitch("image")}
                variant={mode === "image" ? "default" : "ghost"}
                size="sm"
                className={`flex items-center gap-2 ${
                  mode === "image"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Upload Section - Smaller and at the top */}
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                {mode === "video" ? (
                  <>
                    <Video className="h-5 w-5 text-blue-600" />
                    Video Upload
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-5 w-5 text-blue-600" />
                    Image Upload
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Area - Smaller */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors cursor-pointer w-1/2 mx-auto"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => (mode === "video" ? fileInputRef.current?.click() : imageInputRef.current?.click())}
              >
                {mode === "video" ? (
                  <>
                    <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700 mb-1">Drop your video here or click to browse</p>
                    <p className="text-xs text-gray-500">Supports MP4, AVI, MOV, WebM (Max 500MB)</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700 mb-1">Drop your image here or click to browse</p>
                    <p className="text-xs text-gray-500">Supports JPG, PNG, GIF, WebP (Max 10MB)</p>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </>
                )}
              </div>

              {/* Media Preview - Smaller */}
              {mode === "video" && videoUrl && (
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <video
                    src={videoUrl}
                    controls
                    autoPlay
                    muted
                    className="w-32 h-24 rounded-lg shadow-md object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{selectedVideo?.name}</p>
                    <p className="text-xs text-gray-500">
                      {selectedVideo && `${(selectedVideo.size / 1024 / 1024).toFixed(1)} MB`}
                    </p>
                    <Button
                      onClick={generateCaptions}
                      disabled={isProcessing}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 mt-2"
                      size="sm"
                    >
                      {isProcessing ? "Processing..." : "Generate Captions"}
                    </Button>
                  </div>
                </div>
              )}

              {mode === "image" && imageUrl && (
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <img
                    src={imageUrl || "/placeholder.svg"}
                    alt="Uploaded image"
                    className="w-32 h-24 rounded-lg shadow-md object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{selectedImage?.name}</p>
                    <p className="text-xs text-gray-500">
                      {selectedImage && `${(selectedImage.size / 1024 / 1024).toFixed(1)} MB`}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      ✅ Image loaded! Ask me questions about what you see in the chat.
                    </p>
                    <Button
                      onClick={generateCaptions}
                      disabled={isProcessing}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 mt-2"
                      size="sm"
                    >
                      {isProcessing ? "Processing..." : "Generate Captions"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat Section - Bigger and in the center */}
          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Bot className="h-6 w-6 text-indigo-600" />
                AI Assistant
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({mode === "video" ? "Video Captioning" : "Image VQA"})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col h-[700px]">
                {/* Messages */}
                <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
                  <div className="space-y-6">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {message.role === "assistant" && (
                          <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex-shrink-0">
                            <Bot className="h-5 w-5 text-white" />
                          </div>
                        )}
                        <div
                          className={`max-w-[75%] p-4 rounded-lg ${
                            message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                          <p className="text-xs opacity-70 mt-2">{message.timestamp.toLocaleTimeString()}</p>
                        </div>
                        {message.role === "user" && (
                          <div className="p-2 bg-blue-600 rounded-full flex-shrink-0">
                            <User className="h-5 w-5 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-6 border-t bg-gray-50/50">
                  <div className="flex gap-3">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder={
                        mode === "video"
                          ? selectedVideo
                            ? "Ask about captioning, formats, or processing..."
                            : "Upload a video first to start asking questions..."
                          : selectedImage
                            ? "Ask me about the image..."
                            : "Upload an image first to start asking questions..."
                      }
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      className="flex-1 h-12"
                      disabled={(mode == "video" && !selectedVideo) || (mode == "image" && !selectedImage)}
                    />
                    <Button
                      onClick={sendMessage}
                      size="icon"
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-12 w-12"
                      disabled={(mode == "video" && !selectedVideo) || (mode == "image" && !selectedImage)}
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Processing Steps Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-center text-xl">Processing Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <div
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all duration-300 ${
                      processingSteps.videoMotion ? "bg-green-500 border-green-500" : "border-gray-300"
                    }`}
                  >
                    {processingSteps.videoMotion && <Check className="h-4 w-4 text-white" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">Video motion extracted</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <div
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all duration-300 ${
                      processingSteps.keyFrames ? "bg-green-500 border-green-500" : "border-gray-300"
                    }`}
                  >
                    {processingSteps.keyFrames && <Check className="h-4 w-4 text-white" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">Key Frames extracted</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <div
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all duration-300 ${
                      processingSteps.audioTranscription ? "bg-green-500 border-green-500" : "border-gray-300"
                    }`}
                  >
                    {processingSteps.audioTranscription && <Check className="h-4 w-4 text-white" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">Audio transcription extracted</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <div
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all duration-300 ${
                      processingSteps.captionGenerated ? "bg-green-500 border-green-500" : "border-gray-300"
                    }`}
                  >
                    {processingSteps.captionGenerated && <Check className="h-4 w-4 text-white" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">Caption generated</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
