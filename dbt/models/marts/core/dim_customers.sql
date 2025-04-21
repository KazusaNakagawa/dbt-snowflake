{{
    config(
        materialized='table'
    )
}}

SELECT 
    customer_id,
    name,
    address,
    nation_id,
    phone,
    account_balance,
    market_segment,
    email
FROM {{ ref('stg_customers') }}
