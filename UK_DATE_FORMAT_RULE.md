# UK DATE FORMAT RULE

**CRITICAL RULE FOR ALL DEVELOPERS:**

All date formatting across the entire application must follow UK format conventions:

## Display Formats (User-facing):
- **Short dates**: `dd/MM/yyyy` (e.g., 25/12/2024)
- **Medium dates**: `dd/MM` for same year (e.g., 25/12)
- **Long dates**: `EEEE, dd MMMM yyyy` (e.g., Monday, 25 December 2024)

## Internal Formats (Database/API):
- **ISO format**: `yyyy-MM-dd` for database storage and API communication
- This ensures compatibility while displaying in UK format to users

## NEVER USE US FORMATS:
- ❌ MM/dd/yyyy (US format)
- ❌ MMM d (e.g., Dec 25)
- ❌ MMMM do, yyyy (e.g., December 25th, 2024)

## Implementation:
- Use `format()` from `date-fns` with UK patterns
- Always add comment: `// UK DATE FORMAT RULE: Always use dd/MM/yyyy format for consistency across the entire app`
- Internal ISO dates kept for database compatibility

This ensures consistent UK date formatting throughout the entire bndy application.