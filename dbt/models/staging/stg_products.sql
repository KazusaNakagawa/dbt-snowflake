{{
    config(
        materialized='view'
    )
}}

SELECT
  p_partkey as product_id,
  p_name as product_name,
  p_mfgr as manufacturer,
  p_brand as brand,
  p_type as type,
  p_size as size,
  p_container as container,
  p_retailprice as retail_price
FROM SNOWFLAKE_SAMPLE_DATA.TPCH_SF1.PART
