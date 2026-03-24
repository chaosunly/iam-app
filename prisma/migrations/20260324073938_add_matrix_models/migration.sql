-- CreateTable
CREATE TABLE "matrix_orgs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "homeserver" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matrix_orgs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matrix_spaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "matrix_id" TEXT,
    "org_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matrix_spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matrix_rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "matrix_id" TEXT,
    "space_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matrix_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matrix_role_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matrix_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "matrix_orgs_name_key" ON "matrix_orgs"("name");

-- CreateIndex
CREATE INDEX "matrix_spaces_org_id_idx" ON "matrix_spaces"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "matrix_spaces_org_id_name_key" ON "matrix_spaces"("org_id", "name");

-- CreateIndex
CREATE INDEX "matrix_rooms_space_id_idx" ON "matrix_rooms"("space_id");

-- CreateIndex
CREATE UNIQUE INDEX "matrix_rooms_space_id_name_key" ON "matrix_rooms"("space_id", "name");

-- CreateIndex
CREATE INDEX "matrix_role_assignments_user_id_idx" ON "matrix_role_assignments"("user_id");

-- CreateIndex
CREATE INDEX "matrix_role_assignments_resource_type_resource_id_idx" ON "matrix_role_assignments"("resource_type", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "matrix_role_assignments_user_id_resource_type_resource_id_key" ON "matrix_role_assignments"("user_id", "resource_type", "resource_id");

-- AddForeignKey
ALTER TABLE "matrix_spaces" ADD CONSTRAINT "matrix_spaces_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "matrix_orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matrix_rooms" ADD CONSTRAINT "matrix_rooms_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "matrix_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
