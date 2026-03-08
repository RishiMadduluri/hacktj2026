import json
from pathlib import Path

import cv2
from ultralytics import YOLO


def detect_people_in_video(src_path, bbox_output_path, keyframe_step=15):
    """
    Run person detection on a video file and write bounding box data to JSON.

    Args:
        src_path: Input video file path.
        bbox_output_path: Where to save the JSON results.
        keyframe_step: Run detection every N frames; reuse last result otherwise.
    """
    detector = YOLO("yolov8s.pt")

    video = cv2.VideoCapture(str(src_path))
    if not video.isOpened():
        raise IOError(f"Cannot open video: {src_path}")

    w = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frame_rate = int(video.get(cv2.CAP_PROP_FPS))
    num_frames = int(video.get(cv2.CAP_PROP_FRAME_COUNT))

    output = {
        "metadata": {
            "filename": src_path.name,
            "resolution": [w, h],
            "fps": frame_rate,
            "frame_count": num_frames,
            "keyframe_interval": keyframe_step,
        },
        "detections": {},
    }

    print(f"Processing: {src_path.name} ({num_frames} frames)")

    idx = 0
    prev_boxes = None
    prev_confs = None

    while True:
        ok, frame = video.read()
        if not ok:
            break

        is_keyframe = idx % keyframe_step == 0

        if is_keyframe:
            predictions = detector.predict(
                frame,
                classes=[0],
                conf=0.2,
                iou=0.2,
                verbose=False,
            )

            detected_boxes = []
            detected_confs = []

            for pred in predictions:
                for bbox in pred.boxes:
                    coords = bbox.xyxy[0].cpu().numpy()
                    x1 = max(0, int(coords[0]))
                    y1 = max(0, int(coords[1]))
                    x2 = min(w, int(coords[2]))
                    y2 = min(h, int(coords[3]))
                    detected_boxes.append([x1, y1, x2, y2])
                    detected_confs.append(float(bbox.conf))

            prev_boxes = detected_boxes
            prev_confs = detected_confs

        output["detections"][str(idx)] = {
            "boxes": prev_boxes if prev_boxes else [],
            "confidences": prev_confs if prev_confs else [],
            "keyframe": is_keyframe,
        }

        idx += 1
        if idx % 100 == 0:
            print(f"  {idx}/{num_frames} frames done")

    video.release()

    with open(bbox_output_path, "w") as fp:
        json.dump(output, fp, indent=2)
    print(f"Saved bounding boxes: {bbox_output_path}")


def main():
    video_folder = Path("public/videos")
    output_folder = Path("public")
    output_folder.mkdir(exist_ok=True)

    videos = sorted(video_folder.glob("*.mp4"))

    if not videos:
        print("No MP4 files found in public/videos/")
        return

    for vpath in videos:
        if vpath.stem.endswith("_boxes"):
            continue

        print(f"\nStarting: {vpath.name}")
        json_out = output_folder / f"{vpath.stem}_boxes.json"
        detect_people_in_video(vpath, json_out)


if __name__ == "__main__":
    main()
