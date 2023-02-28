-- Up Migration
CREATE UNIQUE INDEX "idx_mq_jobs_id" ON "public"."mq_jobs_data" USING btree (
  "id"
);
-- Down Migration
