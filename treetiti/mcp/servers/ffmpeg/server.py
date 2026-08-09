import subprocess, json, os, asyncio
from typing import Any

async def handle_request(request: dict[str, Any]) -> dict[str, Any]:
    method = request.get("method", "")
    params = request.get("params", {})

    if method == "tools/list":
        return {
            "tools": [
                {
                    "name": "optimize_video",
                    "description": "Optimize a video file for web delivery (compress, resize, convert to H.264/H.265)",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "input": {"type": "string", "description": "Path to input video file"},
                            "output": {"type": "string", "description": "Path for output video file"},
                            "width": {"type": "integer", "description": "Target width in pixels (optional)"},
                            "crf": {"type": "integer", "description": "Quality: 18-28 (lower = better quality, default 23)"},
                            "preset": {"type": "string", "enum": ["fast", "medium", "slow", "veryslow"], "description": "Encoding speed preset"},
                        },
                        "required": ["input", "output"],
                    },
                },
                {
                    "name": "generate_video_stills",
                    "description": "Generate poster frames / thumbnails from a video at specified timestamps",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "input": {"type": "string", "description": "Path to input video file"},
                            "output_dir": {"type": "string", "description": "Directory for output images"},
                            "timestamps": {"type": "array", "items": {"type": "string"}, "description": "Timestamps like ['00:00:01', '00:00:03']"},
                        },
                        "required": ["input", "output_dir"],
                    },
                },
                {
                    "name": "get_video_info",
                    "description": "Get metadata about a video file (codec, resolution, duration, bitrate)",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "input": {"type": "string", "description": "Path to video file"},
                        },
                        "required": ["input"],
                    },
                },
                {
                    "name": "concat_videos",
                    "description": "Concatenate multiple video files into one",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "inputs": {"type": "array", "items": {"type": "string"}, "description": "List of video file paths to concatenate"},
                            "output": {"type": "string", "description": "Path for output video file"},
                        },
                        "required": ["inputs", "output"],
                    },
                },
            ]
        }

    if method == "tools/call":
        tool = params.get("name", "")
        args = params.get("arguments", {})

        if tool == "optimize_video":
            cmd = ["ffmpeg", "-i", args["input"], "-c:v", "libx264", "-preset", args.get("preset", "medium"), "-crf", str(args.get("crf", 23)), "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart"]
            if "width" in args:
                cmd.extend(["-vf", f"scale={args['width']}:-2"])
            cmd.append(args["output"])
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                return {"content": [{"type": "text", "text": f"Error: {result.stderr}"}]}
            return {"content": [{"type": "text", "text": f"Video optimized → {args['output']}"}]}

        if tool == "generate_video_stills":
            timestamps = args.get("timestamps", ["00:00:01"])
            outputs = []
            for ts in timestamps:
                out = os.path.join(args["output_dir"], f"poster_{ts.replace(':', '-')}.jpg")
                cmd = ["ffmpeg", "-i", args["input"], "-ss", ts, "-vframes", "1", "-q:v", "3", out]
                subprocess.run(cmd, capture_output=True, text=True)
                outputs.append(out)
            return {"content": [{"type": "text", "text": f"Stills generated: {', '.join(outputs)}"}]}

        if tool == "get_video_info":
            cmd = ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", args["input"]]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                return {"content": [{"type": "text", "text": f"Error: {result.stderr}"}]}
            info = json.loads(result.stdout)
            return {"content": [{"type": "text", "text": json.dumps(info, indent=2)}]}

        if tool == "concat_videos":
            filelist = "/tmp/concat_list.txt"
            with open(filelist, "w") as f:
                for v in args["inputs"]:
                    f.write(f"file '{v}'\n")
            cmd = ["ffmpeg", "-f", "concat", "-safe", "0", "-i", filelist, "-c", "copy", args["output"]]
            result = subprocess.run(cmd, capture_output=True, text=True)
            os.remove(filelist)
            if result.returncode != 0:
                return {"content": [{"type": "text", "text": f"Error: {result.stderr}"}]}
            return {"content": [{"type": "text", "text": f"Videos concatenated → {args['output']}"}]}

    return {"content": [{"type": "text", "text": f"Unknown method: {method}"}]}


if __name__ == "__main__":
    import sys
    async def main():
        while True:
            line = sys.stdin.readline()
            if not line:
                break
            request = json.loads(line)
            response = await handle_request(request)
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()
    asyncio.run(main())
