import os
import time
import json
from pathlib import Path

import google.generativeai as genai


def read_env_file():
    """Read and parse the .env.local configuration file."""
    env_file = Path(__file__).parent.parent / ".env.local"
    if not env_file.exists():
        raise FileNotFoundError(f"Missing environment file: {env_file}")

    with env_file.open() as handle:
        for raw_line in handle:
            stripped = raw_line.strip()
            if stripped and not stripped.startswith("#"):
                name, val = stripped.split("=", 1)
                os.environ[name.strip()] = val.strip().strip("\"'")


read_env_file()
genai.configure(api_key=os.environ["GOOGLE_API_KEY"])


def send_file_to_gemini(filepath, mime=None):
    """Upload a file to Gemini for processing."""
    uploaded = genai.upload_file(filepath, mime_type=mime)
    print(f"Uploading: {filepath}")
    return uploaded


def poll_until_ready(file_list):
    """Block until all uploaded files are ready for use."""
    print("Waiting for files to become active...")
    for f in file_list:
        current = genai.get_file(f.name)
        while current.state.name == "PROCESSING":
            print(".", end="", flush=True)
            time.sleep(10)
            current = genai.get_file(f.name)
        if current.state.name != "ACTIVE":
            raise RuntimeError(f"File {f.name} failed during processing")
    print("\nFiles ready.")


def analyze_single_video(video_file_path, gemini_model):
    """Send a single video to Gemini and return the analysis text."""
    try:
        uploaded_file = send_file_to_gemini(str(video_file_path), mime="video/mp4")
        poll_until_ready([uploaded_file])

        session = gemini_model.start_chat()
        analysis_prompt = """
        Analyze this video for medical or health-related events. Provide:
        1. The likely setting/location (hospital, clinic, home, public space, etc.)
        2. A timeline of notable events with timestamps (mm:ss format)
        3. Any medical emergencies, falls, signs of distress, or health concerns observed

        Be thorough and specific in your observations.
        """

        reply = session.send_message([uploaded_file, analysis_prompt])
        return reply.text
    except Exception as err:
        return f"ERROR analyzing {video_file_path.name}: {err}"


def main():
    config = {
        "temperature": 0.7,
        "top_p": 0.95,
        "top_k": 64,
        "max_output_tokens": 8192,
    }

    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        generation_config=config,
    )

    video_dir = Path("public/videos")
    all_videos = sorted(video_dir.glob("*.mp4"))

    results_file = Path("lib/video_analysis_output.txt")
    for vid in all_videos:
        print(f"\nAnalyzing: {vid.name}")

        analysis_text = analyze_single_video(vid, model)

        with results_file.open("a") as out:
            out.write(f"\n\n{'=' * 72}\n")
            out.write(f"# Video: {vid.name}\n")
            out.write(f"# Analyzed: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            out.write(f"{'=' * 72}\n\n")
            out.write(analysis_text)

        print(f"Results saved to {results_file}")
        time.sleep(2)


if __name__ == "__main__":
    main()
