import os
import re
import sys
from datetime import datetime


def list_user_directories():
    """List all directories in the archive folder and let user select one"""
    archive_path = os.path.join("..", "archive")
    if not os.path.exists(archive_path):
        print(f"Error: {archive_path} directory not found.")
        sys.exit(1)

    user_dirs = [d for d in os.listdir(archive_path) if os.path.isdir(os.path.join(archive_path, d))]
    if not user_dirs:
        print(f"No user directories found in {archive_path}.")
        sys.exit(1)

    print("\n=== Available User Profiles ===")
    for i, directory in enumerate(user_dirs, 1):
        print(f"{i}. {directory}")

    while True:
        try:
            selection = int(input("\nSelect a user profile (enter number): "))
            if 1 <= selection <= len(user_dirs):
                selected_dir = user_dirs[selection - 1]
                print(f"\nSelected profile: {selected_dir}")
                return os.path.join(archive_path, selected_dir)
            else:
                print(f"Please enter a number between 1 and {len(user_dirs)}")
        except ValueError:
            print("Please enter a valid number")


def find_latest_file(directory, pattern):
    """Find the latest file in directory matching the pattern"""
    matching_files = [f for f in os.listdir(directory) if re.match(pattern, f)]
    if not matching_files:
        return None

    latest_file = sorted(matching_files,
                         key=lambda x: re.search(r'(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})', x).group(1)
                         if re.search(r'(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})', x) else "",
                         reverse=True)[0]
    return os.path.join(directory, latest_file)


def save_report(report, reports_dir=os.path.join("..", "reports")):  # Changed default to parent directory
    """Save report to file with UTF-8 encoding"""
    if not os.path.exists(reports_dir):
        os.makedirs(reports_dir)

    filename = os.path.join(reports_dir, f"health_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt")
    with open(filename, "w", encoding="utf-8") as f:
        f.write(report)
    return filename