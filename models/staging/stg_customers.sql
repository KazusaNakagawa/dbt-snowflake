{{
    config(
        materialized='view'
    )
}}

SELECT 
    customer_id,
    first_name,
    last_name,
    email
FROM raw.customers
