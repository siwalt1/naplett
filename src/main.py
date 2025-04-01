import warnings
from src.utils import list_user_directories, save_report
from src.data_loader import load_user_data, preprocess_data
from src.data_analyzer import analyze_data
from src.recommendation_engine import generate_recommendations
from src.report_generator import generate_health_report

warnings.filterwarnings('ignore')


def main():
    print("\n" + "=" * 80)
    print("HEALTH MONITORING SYSTEM")
    print("=" * 80)

    user_dir = list_user_directories()
    data = load_user_data(user_dir)
    processed_data = preprocess_data(data)
    merged_df, recent_df = analyze_data(processed_data)

    if merged_df is None or recent_df is None or recent_df.empty:
        print("Error: Insufficient data for analysis.")
        return

    recommendations, alerts, insights = generate_recommendations(merged_df, recent_df, processed_data)
    report = generate_health_report(merged_df, recent_df, recommendations, alerts, insights)

    print("\n" + report)
    filename = save_report(report)
    print(f"\nHealth report saved to {filename}")


if __name__ == "__main__":
    main()