{{
    config(
        materialized='view'
    )
}}

SELECT 
    product_id,
    product_name,
    price,
    category
FROM raw.products
