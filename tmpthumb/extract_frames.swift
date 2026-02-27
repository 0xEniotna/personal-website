import Foundation
import AVFoundation
import AppKit

func savePNG(cgImage: CGImage, to url: URL) throws {
    let rep = NSBitmapImageRep(cgImage: cgImage)
    guard let data = rep.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "FrameExport", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to encode PNG"])
    }
    try data.write(to: url)
}

let args = CommandLine.arguments
if args.count < 4 {
    fputs("Usage: extract_frames <input.mov> <output_dir> <frame_count>\n", stderr)
    exit(1)
}

let inputURL = URL(fileURLWithPath: args[1])
let outputDir = URL(fileURLWithPath: args[2], isDirectory: true)
let frameCount = max(2, Int(args[3]) ?? 12)

let fm = FileManager.default
try? fm.createDirectory(at: outputDir, withIntermediateDirectories: true)

let asset = AVAsset(url: inputURL)
let durationSeconds = CMTimeGetSeconds(asset.duration)
if !durationSeconds.isFinite || durationSeconds <= 0 {
    fputs("Invalid duration\n", stderr)
    exit(2)
}

let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.requestedTimeToleranceAfter = .zero
generator.requestedTimeToleranceBefore = .zero

for i in 0..<frameCount {
    let t = durationSeconds * Double(i) / Double(frameCount - 1)
    let cmTime = CMTime(seconds: t, preferredTimescale: 600)
    do {
        let image = try generator.copyCGImage(at: cmTime, actualTime: nil)
        let name = String(format: "frame-%03d.png", i)
        let target = outputDir.appendingPathComponent(name)
        try savePNG(cgImage: image, to: target)
        print("wrote \(target.path)")
    } catch {
        fputs("Failed frame \(i) at t=\(t): \(error)\n", stderr)
    }
}
