import pandas as pd
from io import StringIO
from datetime import datetime, timedelta
from models import db, SleepRecord

def process_oura_import(user_id, file_object):
    """
    Process an Oura Ring CSV export file and store the data in the database

    Args:
        user_id: The ID of the user the data belongs to
        file_object: A file-like object containing the CSV data

    Returns:
        list: List of SleepRecord objects that were created
    """
    # Read the CSV file
    content = file_object.read().decode('utf-8')

    # Validate that this is an Oura sleep CSV
    if "Total Sleep Duration" not in content or "Sleep Score" not in content:
        raise ValueError("The uploaded file does not appear to be an Oura sleep data export")

    # Parse with pandas
    df = pd.read_csv(StringIO(content))

    # Check required columns
    required_columns = [
        'date', 'Total Sleep Duration', 'Deep Sleep Duration',
        'REM Sleep Duration', 'Light Sleep Duration', 'Sleep Efficiency',
        'Bedtime Start', 'Bedtime End'
    ]

    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")

    # Process each row and create sleep records
    processed_records = []

    for _, row in df.iterrows():
        # Parse date
        record_date = pd.to_datetime(row['date']).date()

        # Check if record already exists for this date
        existing_record = SleepRecord.query.filter_by(
            user_id=user_id,
            record_date=record_date
        ).first()

        if existing_record:
            # Update existing record
            record = existing_record
        else:
            # Create new record
            record = SleepRecord(
                user_id=user_id,
                record_date=record_date,
                source='oura'
            )

        # Parse sleep metrics
        try:
            # Parse time values - handle datetime strings
            bedtime_start = pd.to_datetime(row['Bedtime Start'])
            bedtime_end = pd.to_datetime(row['Bedtime End'])

            # Calculate sleep midpoint
            sleep_duration_seconds = (bedtime_end - bedtime_start).total_seconds()
            midpoint_time = bedtime_start + timedelta(seconds=sleep_duration_seconds / 2)

            # Handle duration values with unit conversion
            # Oura data is likely in seconds, convert to minutes for our database
            total_sleep = float(row['Total Sleep Duration'])
            deep_sleep = float(row['Deep Sleep Duration'])
            rem_sleep = float(row['REM Sleep Duration'])
            light_sleep = float(row['Light Sleep Duration'])

            # Convert from seconds to minutes if values are very large
            if total_sleep > 5000:  # If value is likely in seconds
                total_sleep = total_sleep / 60
                deep_sleep = deep_sleep / 60
                rem_sleep = rem_sleep / 60
                light_sleep = light_sleep / 60

            # Calculate awake time
            # If "Awake Time" is available, use it directly
            if 'Awake Time' in row and pd.notna(row['Awake Time']):
                awake_time = float(row['Awake Time'])
                # Convert from seconds to minutes if needed
                if awake_time > 3000:
                    awake_time = awake_time / 60
            else:
                # Otherwise calculate from total bedtime
                total_bedtime = float(row.get('Total Bedtime', 0))
                # Convert if needed
                if total_bedtime > 3000:
                    total_bedtime = total_bedtime / 60
                awake_time = total_bedtime - total_sleep

            # Update record with parsed values
            record.total_sleep_duration = int(total_sleep)
            record.deep_sleep_duration = int(deep_sleep)
            record.rem_sleep_duration = int(rem_sleep)
            record.light_sleep_duration = int(light_sleep)
            record.awake_duration = int(max(0, awake_time))  # Ensure non-negative

            record.bedtime_start = bedtime_start
            record.bedtime_end = bedtime_end
            record.sleep_midpoint = midpoint_time

            # Fix efficiency value - Oura may provide as decimal (0.85) or percentage (85)
            efficiency_value = float(row['Sleep Efficiency'])
            if efficiency_value > 100:  # If value is very large (likely misinterpreted)
                record.efficiency = efficiency_value / 100
            else:
                record.efficiency = efficiency_value

            # Handle restless sleep
            if 'Restless Sleep' in row and pd.notna(row['Restless Sleep']):
                restless_value = float(row['Restless Sleep'])
                record.restless_periods = int(restless_value)
            else:
                record.restless_periods = 0

            # Optional physiological metrics
            if 'Lowest Resting Heart Rate' in row and pd.notna(row['Lowest Resting Heart Rate']):
                record.lowest_heart_rate = int(float(row['Lowest Resting Heart Rate']))

            if 'Average HRV' in row and pd.notna(row['Average HRV']):
                record.average_hrv = float(row['Average HRV'])

            if 'Average Resting Heart Rate' in row and pd.notna(row['Average Resting Heart Rate']):
                record.resting_heart_rate = int(float(row['Average Resting Heart Rate']))

            if 'Respiratory Rate' in row and pd.notna(row['Respiratory Rate']):
                record.respiratory_rate = float(row['Respiratory Rate'])

            if 'Temperature Deviation (°C)' in row and pd.notna(row['Temperature Deviation (°C)']):
                record.body_temperature = float(row['Temperature Deviation (°C)'])

            # Parse sleep score directly from Oura if available
            if 'Sleep Score' in row and pd.notna(row['Sleep Score']):
                sleep_score = float(row['Sleep Score'])
                # Normalize to 0-100 range if necessary
                if sleep_score > 100:
                    sleep_score = sleep_score / 100
                record.sleep_score = sleep_score

            # Add record to session if it's new
            if not existing_record:
                db.session.add(record)

            processed_records.append(record)

        except Exception as e:
            # Log the error and continue with next record
            print(f"Error processing record for date {record_date}: {str(e)}")
            continue

    # Commit all records to the database
    db.session.commit()

    # If we imported more than 14 days of data, recalculate all baselines
    if len(processed_records) > 14:
        # Use process_all_data=True to recalculate all historical baselines
        from services.analysis import calculate_baseline
        calculate_baseline(user_id, process_all_data=True)
    else:
        # Just update the latest baseline
        from services.analysis import calculate_baseline
        calculate_baseline(user_id)

    # Calculate sleep scores and trends
    calculate_scores_and_trends(user_id, processed_records)

    return processed_records

def calculate_scores_and_trends(user_id, processed_records):
    """
    Calculate sleep scores for newly imported records and generate trends

    Args:
        user_id: The ID of the user the data belongs to
        processed_records: List of processed SleepRecord objects
    """
    from services.analysis import calculate_sleep_score, calculate_trends, generate_insights

    # Get the current baseline
    from models import Baseline
    baseline = Baseline.query.filter_by(user_id=user_id).order_by(Baseline.updated_at.desc()).first()

    # Calculate sleep scores for records that don't have them
    for record in processed_records:
        if record.sleep_score is None:
            sleep_score_data = calculate_sleep_score(record, baseline)
            record.sleep_score = sleep_score_data['total_score']
            record.sleep_score_components = sleep_score_data['components']

    db.session.commit()

    # Update trends and insights
    calculate_trends(user_id)
    generate_insights(user_id)