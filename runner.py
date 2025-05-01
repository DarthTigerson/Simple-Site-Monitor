from typing import Dict, Any
import json
import time
import requests
import socket
import ssl
from datetime import datetime, timedelta
from database import engine, SessionLocal
from sqlalchemy.orm import Session
import models.models as models

CONFIG_PATH = "data/config.json"

models.Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        

def read_config() -> Dict[str, Any]:
    """Read the configuration from the JSON file."""
    try:
        with open(CONFIG_PATH, 'r') as f:
            return json.load(f)
    except Exception as e:
        raise Exception(f"Error reading config: {str(e)}")
    
    
def get_runner_site_log(name: str, db: Session) -> models.RunnerSiteLog:
    site_log = db.query(models.RunnerSiteLog).filter(
        models.RunnerSiteLog.name == name
    ).order_by(
        models.RunnerSiteLog.last_scan_time.desc()
    ).first()
    
    if site_log is None:
        # Create an instance of RunnerSiteLog
        site_log = models.RunnerSiteLog(
            name=name,
            status="unknown",
            response_time=0,
            attempt_count=0,
            created_at=datetime.now(),
            last_scan_time=datetime.now(),
            ssl_days_remaining=0
        )
        db.add(site_log)
        db.commit()
        db.refresh(site_log)
        print(f"Created new site log for {site_log.name}")
        
    return site_log


def basic_site_scraper(url: str, timeout: int):
    try:
        start_time = time.time()
        response = requests.get(url, timeout=timeout)
        response_time = time.time() - start_time
        return response, response_time
    except Exception as e:
        return None
    

def ssl_check(url: str):
    try:
        hostname = url.split("://")[1].split("/")[0]
        
        context = ssl.create_default_context()
        with socket.create_connection((hostname, 443)) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                # Get expiry date
                expire_date = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                # Calculate days remaining
                days_remaining = (expire_date - datetime.now()).days
                return days_remaining
    except Exception as e:
        return None


def update_last_scan_time(
    site_log: models.RunnerSiteLog,
    db: Session,
    response_time: float=0.0,
    ssl_days_remaining: int = None
):
    site_log.last_scan_time = datetime.now()
    site_log.attempt_count = 0
    site_log.response_time = response_time
    site_log.ssl_days_remaining = ssl_days_remaining
    
    db.commit()
    db.refresh(site_log)
    print(f"Updated last scan time for {site_log.name}")
    return
    

def change_state(
    site_log: models.RunnerSiteLog,
    new_status: str,
    response_time: float,
    db: Session,
    webhook_state: bool,
    ssl_days_remaining: int = 0
):
    site_log.last_scan_time = datetime.now()
    db.commit()
    db.refresh(site_log)
    
    new_site_log = models.RunnerSiteLog(
        name=site_log.name,
        status=new_status,
        response_time=response_time,
        attempt_count=0,
        created_at=datetime.now(),
        last_scan_time=datetime.now(),
        ssl_days_remaining=ssl_days_remaining
    )
    
    db.add(new_site_log)
    db.commit()
    db.refresh(new_site_log)
    
    if webhook_state:
        previous_state_duration = (datetime.now() - site_log.created_at).total_seconds()
        
        trigger_webhook(
            site_log.name,
            site_log.url,
            new_status,
            response_time,
            ssl_days_remaining,
            previous_state_duration
        )
    print(f"Changed state for {site_log.name} to {new_status}")
    return


def trigger_webhook(
    name: str,
    url: str,
    status: str,
    response_time: float = 0.0,
    ssl_days_remaining: int = 0,
    previous_state_duration: int = 0,
    log: str = ""
):
    config = read_config()
    include_error_debugging = config['include_error_debugging']
    webhook_type = config['webhooks']['type']
    webhook_url = config['webhooks']['url']
    title = f'{name} - {status}'
    
    if status == "up":
        color = 0x00FF00
    elif status == "down":
        color = 0xFF0000
    elif status == "slow":
        color = 0xFFFF00
    elif status == "token_alert":
        color = 0x0000FF
        
    message = f"""
        Site: {name}
        URL: {url}
        Status: {status}
    """
    
    if response_time > 0:
        message += f"\nResponse Time: {response_time}"
        
    if ssl_days_remaining > 0:
        message += f"\nSSL Days Remaining: {ssl_days_remaining}"
    
    message += f"\n------------------------------------------------------\nPrevious State Duration: {previous_state_duration}"
    
    if log and include_error_debugging:
        message += f"\n------------------------------------------------------\nLog: {log}"
    
    if webhook_type == "discord":
        trigger_discord_webhook(webhook_url, color, message, title)
    elif webhook_type == "slack":
        trigger_slack_webhook(webhook_url, color, message, title)


def trigger_discord_webhook(webhook_url: str, color: int, message: str, title: str):
    """Send a webhook notification to Discord"""
    try:
        # Create Discord webhook payload
        payload = {
            "embeds": [
                {
                    "title": title,
                    "description": message,
                    "color": color,
                    "timestamp": datetime.now().isoformat()
                }
            ]
        }
        
        # Send webhook request
        response = requests.post(
            webhook_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        
        # Check if request was successful
        if response.status_code < 200 or response.status_code >= 300:
            print(f"Failed to send Discord webhook: {response.status_code} {response.text}")
    except Exception as e:
        print(f"Error sending Discord webhook: {str(e)}")


def trigger_slack_webhook(webhook_url: str, color: int, message: str, title: str):
    """Send a webhook notification to Slack"""
    try:
        # Convert int color to hex string for Slack
        hex_color = f"#{color:06x}"
        
        # Create Slack webhook payload
        payload = {
            "attachments": [
                {
                    "color": hex_color,
                    "title": title,
                    "text": message,
                    "ts": time.time()
                }
            ]
        }
        
        # Send webhook request
        response = requests.post(
            webhook_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        
        # Check if request was successful
        if response.status_code < 200 or response.status_code >= 300:
            print(f"Failed to send Slack webhook: {response.status_code} {response.text}")
    except Exception as e:
        print(f"Error sending Slack webhook: {str(e)}")


def runner(db: Session):    
    config = read_config()
    sites = config.get('sites', [])
    runner_delay = config['default_scan_interval']
    slow_threshold = config['default_slow_threshold']
    expiring_token_threshold = config['expiring_token_threshold']
    global_webhook_state = config['webhooks']['enabled']
    attempts_before_trigger = config['attempt_before_trigger']
    next_scan_time = runner_delay
    
    for site in sites:
        print(f"Running scan for {site['name']}")
        site_log = get_runner_site_log(site['name'], db)
        
        if site['scan_interval'] == 0:
            scan_interval = config['default_scan_interval']
        else:
            scan_interval = site['scan_interval']
            
        now = datetime.now()
        time_since_last_scan = (now - site_log.last_scan_time).total_seconds()
        
        time_until_next_scan = max(0, scan_interval - time_since_last_scan)
        next_scan_time = min(next_scan_time, time_until_next_scan)
        
        if now >= site_log.last_scan_time + timedelta(seconds=scan_interval) or site_log.status == "unknown":
            url = site['url']
            scan_type = site['trigger']['type']
            scan_value = site['trigger']['value']
            timeout = site['timeout']
            webhook_state = False
            monitor_expiring_token = site['monitor_expiring_token']
            status = site_log.status
            
            if site['timeout'] == 0:
                timeout = config['default_timeout']
                
            if site['webhook'] and global_webhook_state:
                webhook_state = True
            
            response, response_time = basic_site_scraper(url, timeout)
            
            # Check if SSL should be monitored and get days remaining
            ssl_days_remaining = 0
            if monitor_expiring_token and response is not None:
                ssl_days_remaining = ssl_check(url)
            
            # Determine if site is technically up
            site_is_up = False
            if response is not None:
                if scan_type == "text":
                    if scan_value in response.text:
                        site_is_up = True
                elif scan_type == "status_code":
                    if response.status_code == int(scan_value):
                        site_is_up = True
            
            # SSL token alert takes priority
            if monitor_expiring_token and response is not None and ssl_days_remaining <= expiring_token_threshold:
                if status != "token_alert":
                    change_state(site_log, "token_alert", response_time, db, webhook_state, ssl_days_remaining)
                else:
                    update_last_scan_time(site_log, db, response_time, ssl_days_remaining)
                continue
            
            # Check for slow response
            if response is not None and response_time >= slow_threshold and site_is_up:
                if status != "slow":
                    change_state(site_log, "slow", response_time, db, webhook_state, ssl_days_remaining)
                else:
                    update_last_scan_time(site_log, db, response_time, ssl_days_remaining)
                continue

            # Handle up/down status
            if site_log.status == "up" and site_is_up:
                update_last_scan_time(site_log, db, response_time, ssl_days_remaining)
            elif site_log.status == "down" and not site_is_up:
                update_last_scan_time(site_log, db, response_time, ssl_days_remaining)
            else:
                if site_log.attempt_count >= attempts_before_trigger:
                    if site_is_up:
                        change_state(site_log, "up", response_time, db, webhook_state, ssl_days_remaining)
                    else:
                        change_state(site_log, "down", response_time, db, webhook_state, ssl_days_remaining)
                else:
                    site_log.response_time = response_time
                    site_log.attempt_count += 1
                    site_log.last_scan_time = datetime.now()
                    
                    db.commit()
                    db.refresh(site_log)
                    
                    continue
        else:
            print(f"Skipping scan for {site['name']} - next scan in {time_until_next_scan:.1f} seconds")
    
    sleep_time = max(1, min(next_scan_time, runner_delay))
    print(f"Putting runner to sleep for {sleep_time:.1f} seconds")
    time.sleep(sleep_time)
        

if __name__ == "__main__":
    try:
        print("Starting Site Monitor Runner...")
        db = SessionLocal()

        while True:
            runner(db)
    except KeyboardInterrupt:
        print("Shutting down Site Monitor Runner...")
    finally:
        db.close()
        print("Runner stopped.")
