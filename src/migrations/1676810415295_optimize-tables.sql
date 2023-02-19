-- Up Migration
ALTER TABLE "attribute_keys" SET (autovacuum_vacuum_scale_factor = 0.0);
ALTER TABLE "attribute_keys" SET (autovacuum_vacuum_threshold = 5000);
ALTER TABLE "attribute_keys" SET (autovacuum_analyze_scale_factor = 0.0);
ALTER TABLE "attribute_keys" SET (autovacuum_analyze_threshold = 5000);

ALTER TABLE "attributes" SET (autovacuum_vacuum_scale_factor = 0.0);
ALTER TABLE "attributes" SET (autovacuum_vacuum_threshold = 5000);
ALTER TABLE "attributes" SET (autovacuum_analyze_scale_factor = 0.0);
ALTER TABLE "attributes" SET (autovacuum_analyze_threshold = 5000);

ALTER TABLE "mq_jobs_data" SET (autovacuum_vacuum_scale_factor = 0.0);
ALTER TABLE "mq_jobs_data" SET (autovacuum_vacuum_threshold = 5000);
ALTER TABLE "mq_jobs_data" SET (autovacuum_analyze_scale_factor = 0.0);
ALTER TABLE "mq_jobs_data" SET (autovacuum_analyze_threshold = 5000);


-- Down Migration
ALTER TABLE "attribute_keys" SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE "attribute_keys" SET (autovacuum_vacuum_threshold = 50);
ALTER TABLE "attribute_keys" SET (autovacuum_analyze_scale_factor = NULL);
ALTER TABLE "attribute_keys" SET (autovacuum_analyze_threshold = 50);

ALTER TABLE "attributes" SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE "attributes" SET (autovacuum_vacuum_threshold = 50);
ALTER TABLE "attributes" SET (autovacuum_analyze_scale_factor = 0.0);
ALTER TABLE "attributes" SET (autovacuum_analyze_threshold = 50);

ALTER TABLE "mq_jobs_data" SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE "mq_jobs_data" SET (autovacuum_vacuum_threshold = 50);
ALTER TABLE "mq_jobs_data" SET (autovacuum_analyze_scale_factor = NULL);
ALTER TABLE "mq_jobs_data" SET (autovacuum_analyze_threshold = 50);
