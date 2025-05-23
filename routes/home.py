from fastapi import APIRouter, Request, HTTPException, Body
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse
import json
import os
import requests
import time
from typing import Dict, List, Any, Optional
from datetime import datetime
from database import SessionLocal
from models.models import RunnerSiteLog

templates = Jinja2Templates(directory="templates")
CONFIG_PATH = "data/config.json"

router = APIRouter(
    prefix="",
    tags=["home"]
)

def read_config() -> Dict[str, Any]:
    """Read the configuration from the JSON file."""
    try:
        with open(CONFIG_PATH, 'r') as f:
            config = json.load(f)
            
        # Check if sites have tags field, add if missing
        for site in config["sites"]:
            if "tags" not in site:
                site["tags"] = []
                
        return config
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading config: {str(e)}")

def write_config(config: Dict[str, Any]) -> None:
    """Write the configuration to the JSON file."""
    try:
        with open(CONFIG_PATH, 'w') as f:
            json.dump(config, f, indent=4)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error writing config: {str(e)}")

def format_duration(seconds):
    """Format a duration in seconds to a human-readable string."""
    if seconds < 60:
        return f"{int(seconds)} seconds"
    elif seconds < 3600:
        minutes = seconds // 60
        return f"{int(minutes)} minutes"
    elif seconds < 86400:
        hours = seconds // 3600
        return f"{int(hours)} hours"
    else:
        days = seconds // 86400
        return f"{int(days)} days"

def format_time_ago(dt):
    """Format a datetime as a human-readable 'time ago' string."""
    now = datetime.now()
    diff = now - dt
    seconds = diff.total_seconds()
    
    return format_duration(seconds) + " ago"

@router.get("/")
async def get_home(request: Request):
    """Render the home page with the current configuration."""
    config = read_config()
    
    # Get site data from database
    db = SessionLocal()
    try:
        # Get the latest status for each site by name
        site_names = {site['name'] for site in config["sites"]}
        all_site_logs = []
        unknown_sites_data = []  # To store sites with no logs yet
        
        for name in site_names:
            # Get the most recent log for this site
            latest_log = db.query(RunnerSiteLog).filter(
                RunnerSiteLog.name == name
            ).order_by(
                RunnerSiteLog.last_scan_time.desc()
            ).first()
            
            # Include all sites, even with unknown status
            if latest_log:
                all_site_logs.append(latest_log)
            else:
                # If no log exists yet, create a temporary dictionary with default values
                # to represent an unknown status site
                site_url = ""
                for site in config["sites"]:
                    if site["name"] == name:
                        site_url = site["url"]
                        break
                
                # Create a dummy log entry for display purposes only
                unknown_sites_data.append({
                    "id": "temp_" + name,
                    "name": name,
                    "url": site_url,
                    "status": "unknown",
                    "response_time": "0.00s",
                    "created_at": "Just added",
                    "last_scan": "Pending scan",
                    "duration": "Pending scan",
                    "ssl_days_remaining": None
                })
        
        # Create stats for the status summary
        total_sites = len(site_names)  # Use all sites from config
        down_sites = sum(1 for log in all_site_logs if log.status == "down")
        slow_sites = sum(1 for log in all_site_logs if log.status == "slow") 
        token_alert_sites = sum(1 for log in all_site_logs if log.status == "token_alert")
        healthy_sites = sum(1 for log in all_site_logs if log.status == "up" or log.status == "healthy")
        unknown_sites = total_sites - down_sites - slow_sites - token_alert_sites - healthy_sites
        
        # Prepare site logs for display
        display_logs = []
        for log in all_site_logs:
            # Calculate duration
            duration_seconds = (log.last_scan_time - log.created_at).total_seconds()
            human_duration = format_duration(duration_seconds)
            
            # Format times for display
            created_at_display = format_time_ago(log.created_at)
            last_scan_display = format_time_ago(log.last_scan_time)
            
            # Get the URL from the config for this site
            site_url = ""
            for site in config["sites"]:
                if site["name"] == log.name:
                    site_url = site["url"]
                    break
            
            display_logs.append({
                "id": str(log.id),
                "name": log.name,
                "url": site_url,
                "status": log.status,
                "response_time": f"{log.response_time:.2f}s",
                "created_at": created_at_display,
                "last_scan": last_scan_display,
                "duration": human_duration,
                "ssl_days_remaining": log.ssl_days_remaining,
                "tags": next((site["tags"] for site in config["sites"] if site["name"] == log.name), [])
            })
        
        # Add the unknown sites to the display logs
        display_logs.extend(unknown_sites_data)
        
        # Sort by status priority (healthy, down, slow, token_alert, unknown)
        def status_priority(log):
            if log["status"] == "up" or log["status"] == "healthy":
                return 0  # Healthy sites first
            elif log["status"] == "down":
                return 1
            elif log["status"] == "slow":
                return 2
            elif log["status"] == "token_alert":
                return 3
            elif log["status"] == "unknown":
                return 4  # Unknown sites last
            else:
                return 0  # Default to healthy for any other status
                
        display_logs.sort(key=status_priority)
        
        return templates.TemplateResponse(
            "home.html", 
            {
                "request": request, 
                "config": config,
                "logs": display_logs,
                "stats": {
                    "total": total_sites,
                    "down": down_sites,
                    "slow": slow_sites,
                    "expiring": token_alert_sites,
                    "healthy": healthy_sites,
                    "unknown": unknown_sites
                }
            }
        )
    finally:
        db.close()

@router.get("/sites")
async def get_sites_page(request: Request):
    """Render the sites page with the current configuration."""
    config = read_config()
    return templates.TemplateResponse("sites.html", {"request": request, "config": config})

@router.get("/settings")
async def get_settings(request: Request):
    """Render the settings page with the current configuration."""
    config = read_config()
    return templates.TemplateResponse("settings.html", {"request": request, "config": config})

@router.get("/history")
async def get_history(request: Request):
    """Render the history page with logs from the database."""
    config = read_config()
    
    # Get the names of sites currently in the configuration
    configured_site_names = {site['name'] for site in config["sites"]}
    
    # Get site data from database
    db = SessionLocal()
    try:
        # Query for all logs, sorted by last_scan_time descending (most recent first)
        all_logs = db.query(RunnerSiteLog).order_by(
            RunnerSiteLog.last_scan_time.desc()
        ).limit(500).all()  # Limit to 500 recent logs for performance
        
        # Filter logs to only include sites that are in the current configuration
        filtered_logs = [log for log in all_logs if log.name in configured_site_names]
        
        # Prepare site data for the history view
        display_logs = []
        
        for log in filtered_logs:
            # Get the URL from the config for this site
            site_url = ""
            for site in config["sites"]:
                if site["name"] == log.name:
                    site_url = site["url"]
                    break
            
            # Calculate start time by subtracting response time
            # Since response_time is in seconds and created_at is a timestamp
            # For more accurate start times you might want to store this separately in your model
            start_time = log.created_at
            end_time = log.last_scan_time
            
            # Calculate duration between start and end time
            duration_seconds = (end_time - start_time).total_seconds()
            
            # Format duration for display
            if duration_seconds < 60:
                duration_display = f"{int(duration_seconds)}s"
            elif duration_seconds < 3600:
                minutes = int(duration_seconds // 60)
                seconds = int(duration_seconds % 60)
                duration_display = f"{minutes}m {seconds}s"
            else:
                hours = int(duration_seconds // 3600)
                minutes = int((duration_seconds % 3600) // 60)
                duration_display = f"{hours}h {minutes}m"
            
            # Format times for display
            start_time_display = start_time.strftime("%Y-%m-%d %H:%M:%S")
            end_time_display = end_time.strftime("%Y-%m-%d %H:%M:%S")
            
            # Format load time (response time)
            if log.response_time < 1:  # Less than 1 second
                load_time_display = f"{int(log.response_time * 1000)} ms"
            else:
                load_time_display = f"{log.response_time:.2f} s"
            
            # Map status to display status
            status_display = "Pending"
            status_class = "unknown"
            
            if log.status == "up" or log.status == "healthy":
                status_display = "Healthy"
                status_class = "success"
            elif log.status == "down":
                status_display = "Down"
                status_class = "error"
            elif log.status == "slow":
                status_display = "Slow"
                status_class = "warning"
            elif log.status == "token_alert":
                status_display = "Token Expiring"
                status_class = "expiring"
            
            # Create a log entry for display
            display_logs.append({
                "id": str(log.id),
                "name": log.name,
                "url": site_url,
                "status": log.status,
                "status_display": status_display,
                "status_class": status_class,
                "start_time": start_time_display,
                "end_time": end_time_display,
                "duration": duration_display,
                "load_time": load_time_display,
                "response_time": log.response_time,
                "raw_start_time": start_time.timestamp(),
                "raw_end_time": end_time.timestamp(),
                "tags": next((site["tags"] for site in config["sites"] if site["name"] == log.name), [])
            })
        
        # Get total count for display
        total_logs = len(display_logs)
        
        return templates.TemplateResponse(
            "history.html", 
            {
                "request": request, 
                "config": config,
                "logs": display_logs,
                "total_logs": total_logs
            }
        )
    finally:
        db.close()

@router.get("/api/sites")
async def get_sites():
    """Get all monitored sites."""
    config = read_config()
    return JSONResponse(content=config["sites"])

@router.get("/api/sites/{site_index}")
async def get_site(site_index: int):
    """Get a specific site by index."""
    try:
        # Logging to debug
        print(f"Get site request for index: {site_index}, type: {type(site_index)}")
        
        config = read_config()
        total_sites = len(config["sites"])
        print(f"Total sites in config: {total_sites}")
        
        if site_index < 0 or site_index >= len(config["sites"]):
            print(f"Site index out of range: {site_index}")
            raise HTTPException(status_code=404, detail=f"Site not found. Index {site_index} is out of range (0-{total_sites-1})")
        
        site_data = config["sites"][site_index]
        print(f"Returning site data for index {site_index}: {site_data}")
        return JSONResponse(content=site_data)
    except ValueError as e:
        print(f"Value error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid site index: {site_index}. Must be an integer.")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving site: {str(e)}")

@router.post("/api/sites")
async def add_site(site: Dict[str, Any] = Body(...)):
    """Add a new site to monitor."""
    config = read_config()
    
    # Validate required fields
    if not all(key in site for key in ["name", "url", "trigger"]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Ensure tags is present
    if "tags" not in site:
        site["tags"] = []
    
    # Add the new site
    config["sites"].append(site)
    write_config(config)
    
    return JSONResponse(content={"message": "Site added successfully"})

@router.put("/api/sites/{site_index}")
async def update_site(site_index: int, site: Dict[str, Any] = Body(...)):
    """Update an existing site."""
    config = read_config()
    
    if site_index < 0 or site_index >= len(config["sites"]):
        raise HTTPException(status_code=404, detail="Site not found")
    
    # Validate required fields
    if not all(key in site for key in ["name", "url", "trigger"]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Ensure tags is present
    if "tags" not in site:
        site["tags"] = []
    
    # Update the site
    config["sites"][site_index] = site
    write_config(config)
    
    return JSONResponse(content={"message": "Site updated successfully"})

@router.delete("/api/sites/{site_index}")
async def delete_site(site_index: int):
    """Delete a site from monitoring."""
    config = read_config()
    
    if site_index < 0 or site_index >= len(config["sites"]):
        raise HTTPException(status_code=404, detail="Site not found")
    
    # Remove the site
    config["sites"].pop(site_index)
    write_config(config)
    
    return JSONResponse(content={"message": "Site deleted successfully"})

@router.post("/api/settings")
async def update_settings(settings: Dict[str, Any] = Body(...)):
    """Update global settings."""
    print("Received settings update:", settings)
    config = read_config()
    print("Current config:", config)
    
    # Update settings
    if "default_scan_interval" in settings:
        config["default_scan_interval"] = settings["default_scan_interval"]
    if "default_timeout" in settings:
        config["default_timeout"] = settings["default_timeout"]
    if "default_slow_threshold" in settings:
        config["default_slow_threshold"] = settings["default_slow_threshold"]
    if "expiring_token_threshold" in settings:
        config["expiring_token_threshold"] = settings["expiring_token_threshold"]
    if "attempt_before_trigger" in settings:
        config["attempt_before_trigger"] = settings["attempt_before_trigger"]
    if "include_error_debugging" in settings:
        config["include_error_debugging"] = settings["include_error_debugging"]
        print("Updated include_error_debugging to:", config["include_error_debugging"])
    
    write_config(config)
    print("Updated config:", config)
    
    return JSONResponse(content={"message": "Settings updated successfully"})

@router.get("/api/webhooks")
async def get_webhooks():
    """Get all webhooks."""
    config = read_config()
    return JSONResponse(content=config["webhooks"])

@router.get("/api/webhooks/{webhook_index}")
async def get_webhook(webhook_index: int):
    """Get a specific webhook by index."""
    config = read_config()
    
    # Since webhooks is now a single object, not an array
    if webhook_index != 0:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    return JSONResponse(content=config["webhooks"])

@router.post("/api/webhooks")
async def add_webhook(webhook: Dict[str, Any] = Body(...)):
    """Add a new webhook."""
    config = read_config()
    
    # Validate required fields
    if not all(key in webhook for key in ["type", "url"]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Validate webhook URL
    url = webhook["url"].strip()
    if url:
        try:
            parsed_url = requests.utils.urlparse(url)
            if not all([parsed_url.scheme, parsed_url.netloc]):
                raise HTTPException(status_code=400, detail="Invalid URL format")
            
            # Validate webhook type
            domain = parsed_url.netloc.lower()
            webhook_type = webhook["type"].lower()
            
            # Ensure type matches URL domain
            if webhook_type == "discord" and "discord.com" not in domain:
                raise HTTPException(status_code=400, detail="URL does not match Discord webhook format")
            elif webhook_type == "slack" and "hooks.slack.com" not in domain:
                raise HTTPException(status_code=400, detail="URL does not match Slack webhook format")
            elif webhook_type not in ["discord", "slack"]:
                raise HTTPException(status_code=400, detail="Only Discord and Slack webhooks are supported")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid webhook URL: {str(e)}")
    
    # Ensure there's an 'enabled' field
    if "enabled" not in webhook:
        webhook["enabled"] = True
    
    # Replace the existing webhook with the new one
    config["webhooks"] = webhook
    write_config(config)
    
    return JSONResponse(content={"message": "Webhook added successfully"})

@router.put("/api/webhooks/{webhook_index}")
async def update_webhook(webhook_index: int, webhook: Dict[str, Any] = Body(...)):
    """Update an existing webhook."""
    config = read_config()
    
    # Since webhooks is now a single object, not an array
    if webhook_index != 0:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    # Validate required fields
    if not all(key in webhook for key in ["type", "url"]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Validate webhook URL if not empty
    url = webhook["url"].strip()
    if url:
        try:
            parsed_url = requests.utils.urlparse(url)
            if not all([parsed_url.scheme, parsed_url.netloc]):
                raise HTTPException(status_code=400, detail="Invalid URL format")
            
            # Validate webhook type
            domain = parsed_url.netloc.lower()
            webhook_type = webhook["type"].lower()
            
            # Ensure type matches URL domain
            if webhook_type == "discord" and "discord.com" not in domain:
                raise HTTPException(status_code=400, detail="URL does not match Discord webhook format")
            elif webhook_type == "slack" and "hooks.slack.com" not in domain:
                raise HTTPException(status_code=400, detail="URL does not match Slack webhook format")
            elif webhook_type not in ["discord", "slack"]:
                raise HTTPException(status_code=400, detail="Only Discord and Slack webhooks are supported")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid webhook URL: {str(e)}")
    
    # Update the webhook
    config["webhooks"] = webhook
    write_config(config)
    
    return JSONResponse(content={"message": "Webhook updated successfully"})

@router.delete("/api/webhooks/{webhook_index}")
async def delete_webhook(webhook_index: int):
    """Delete a webhook."""
    config = read_config()
    
    # Since webhooks is now a single object, not an array
    if webhook_index != 0:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    # Clear webhook by setting to empty dict
    config["webhooks"] = {"type": "", "url": "", "enabled": False}
    write_config(config)
    
    return JSONResponse(content={"message": "Webhook deleted successfully"})

@router.post("/api/test-site")
async def test_site(site_data: Dict[str, Any] = Body(...)):
    """
    Test a site based on provided URL and trigger conditions.
    Returns response data for display in the UI.
    """
    try:
        # Extract required fields
        url = site_data.get("url")
        trigger_type = site_data.get("trigger_type")
        trigger_value = site_data.get("trigger_value")
        timeout = site_data.get("timeout", 10)  # Default to 10 seconds timeout
        
        # Validate required fields
        if not url or not trigger_type or not trigger_value:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Load config to get default timeout if needed
        config = read_config()
        if timeout == 0:
            timeout = config["default_timeout"]
            
        # Make the request to the site
        result = await test_site_request(url, timeout, trigger_type, trigger_value, site_data)
        
        return JSONResponse(content=result)
    except Exception as e:
        print(f"Error testing site: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

async def test_site_request(url: str, timeout: int, trigger_type: str, trigger_value: str, site_data: Dict[str, Any]):
    """
    Makes a request to the site and checks if the trigger condition is met.
    Returns response data including success status, timing, and response details.
    """
    try:
        # Get method, headers, and body from the request if provided
        method = site_data.get("method", "GET").upper()
        content_type = site_data.get("content_type", "application/json")
        body = site_data.get("body", "")
        
        # Set up headers
        headers = {"Content-Type": content_type}
        
        # Make the request with timing
        start_time = time.time()
        
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=timeout)
        elif method == "POST":
            response = requests.post(url, data=body, headers=headers, timeout=timeout)
        elif method == "PUT":
            response = requests.put(url, data=body, headers=headers, timeout=timeout)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=timeout)
        else:
            # Default to GET for unsupported methods
            response = requests.get(url, headers=headers, timeout=timeout)
            
        response_time = time.time() - start_time
        
        # Check if trigger condition is met
        success = False
        if trigger_type == "status_code":
            success = response.status_code == int(trigger_value)
        elif trigger_type == "text":
            success = trigger_value in response.text
        
        # Get content type
        content_type = response.headers.get("Content-Type", "text/plain")
        
        # Prepare result object
        result = {
            "success": success,
            "response_time": round(response_time * 1000, 2),  # Convert to ms
            "status_code": response.status_code,
            "content_type": content_type,
            "body": response.text[:10000],  # Limit response size
        }
        
        return result
    except requests.Timeout:
        return {
            "success": False,
            "error": "Request timed out",
            "response_time": timeout * 1000,
            "status_code": None,
            "content_type": None,
            "body": "Request timed out after {} seconds".format(timeout)
        }
    except requests.RequestException as e:
        return {
            "success": False,
            "error": str(e),
            "response_time": 0,
            "status_code": None,
            "content_type": None,
            "body": f"Error connecting to site: {str(e)}"
        }

@router.post("/api/validate-webhook")
async def validate_webhook(webhook_data: Dict[str, Any] = Body(...)):
    """
    Validate a webhook URL to ensure it's either Discord or Slack.
    Returns the detected webhook type or an error.
    """
    url = webhook_data.get("url", "").strip()
    
    if not url:
        return JSONResponse(content={"valid": False, "error": "Webhook URL cannot be empty"})
    
    # Validate URL format
    try:
        parsed_url = requests.utils.urlparse(url)
        if not all([parsed_url.scheme, parsed_url.netloc]):
            return JSONResponse(content={"valid": False, "error": "Invalid URL format"})
    except Exception:
        return JSONResponse(content={"valid": False, "error": "Invalid URL format"})
    
    # Validate webhook type
    webhook_type = None
    domain = parsed_url.netloc.lower()
    
    # Check Discord webhook pattern
    if "discord.com" in domain and "/api/webhooks/" in url.lower():
        webhook_type = "discord"
    # Check Slack webhook pattern
    elif "hooks.slack.com" in domain and "/services/" in url.lower():
        webhook_type = "slack"
    else:
        return JSONResponse(content={
            "valid": False,
            "error": "Only Discord and Slack webhooks are supported. URL must be from discord.com or hooks.slack.com domains."
        })
    
    return JSONResponse(content={"valid": True, "type": webhook_type})

@router.post("/api/test-webhook")
async def test_webhook(webhook_data: Dict[str, Any] = Body(...)):
    """
    Test a webhook by sending a notification.
    """
    url = webhook_data.get("url", "").strip()
    webhook_type = webhook_data.get("type", "").lower()
    
    if not url:
        raise HTTPException(status_code=400, detail="Webhook URL cannot be empty")
    
    # Validate URL format
    try:
        parsed_url = requests.utils.urlparse(url)
        if not all([parsed_url.scheme, parsed_url.netloc]):
            raise HTTPException(status_code=400, detail="Invalid URL format")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid URL format")
    
    # Validate webhook type
    domain = parsed_url.netloc.lower()
    
    # Ensure type matches URL domain
    if webhook_type == "discord" and "discord.com" not in domain:
        raise HTTPException(status_code=400, detail="URL does not match Discord webhook format")
    elif webhook_type == "slack" and "hooks.slack.com" not in domain:
        raise HTTPException(status_code=400, detail="URL does not match Slack webhook format")
    elif webhook_type not in ["discord", "slack"]:
        raise HTTPException(status_code=400, detail="Only Discord and Slack webhooks are supported")
    
    # Send test notification
    try:
        if webhook_type == "discord":
            await send_discord_test_notification(url)
        elif webhook_type == "slack":
            await send_slack_test_notification(url)
        
        return JSONResponse(content={"success": True, "message": "Test notification sent"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send test notification: {str(e)}")

async def send_discord_test_notification(webhook_url: str):
    """Send a test notification to Discord webhook that matches the format used by the runner"""
    # Determine color (green for test)
    color = 0x00FF00
    
    # Create a message that resembles a real alert
    title = "Test Notification - Simple Site Monitor"
    message = """
        Site: Test Site
        URL: https://example.com
        Status: Test Message
        
        Response Time: 0.123s
        SSL Days Remaining: 365
        ------------------------------------------------------
        Previous State Duration: 0 seconds
        
        This is a test notification to verify your webhook is working correctly.
    """
    
    # Create Discord webhook payload similar to trigger_discord_webhook in runner.py
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
    
    response = requests.post(
        webhook_url,
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=5
    )
    
    if response.status_code < 200 or response.status_code >= 300:
        raise Exception(f"Discord webhook returned status code {response.status_code}")

async def send_slack_test_notification(webhook_url: str):
    """Send a test notification to Slack webhook that matches the format used by the runner"""
    # Determine color (green for test)
    hex_color = "#00FF00"
    
    # Create a message that resembles a real alert
    title = "Test Notification - Simple Site Monitor"
    message = """
        Site: Test Site
        URL: https://example.com
        Status: Test Message
        
        Response Time: 0.123s
        SSL Days Remaining: 365
        ------------------------------------------------------
        Previous State Duration: 0 seconds
        
        This is a test notification to verify your webhook is working correctly.
    """
    
    # Create Slack webhook payload similar to trigger_slack_webhook in runner.py
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
    
    response = requests.post(
        webhook_url,
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=5
    )
    
    if response.status_code < 200 or response.status_code >= 300:
        raise Exception(f"Slack webhook returned status code {response.status_code}")