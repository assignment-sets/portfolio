vercel firewall rules remove rule_rate_limit_email_endpoints_l0RL18

vercel firewall publish

vercel firewall rules add --ai "Rate limit POST requests to /api/send-email to 5 requests per hour by IP"

vercel firewall rules add --ai "Rate limit POST requests to /api/newsletter/subscribe to 5 requests per hour by IP"

vercel firewall rules list
