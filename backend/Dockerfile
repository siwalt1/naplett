FROM python:3.9-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN wget -O /usr/local/bin/wait-for-it.sh https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh \
    && chmod +x /usr/local/bin/wait-for-it.sh

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "app.py"]
#
## Install Python dependencies
#RUN pip install --no-cache-dir -r requirements.txt
#
## Copy application code
#COPY . .
#
## Set environment variables
#ENV PYTHONDONTWRITEBYTECODE=1
#ENV PYTHONUNBUFFERED=1
#
## Expose the port the app runs on
#EXPOSE 5000
#
## Command to run the application
#CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]