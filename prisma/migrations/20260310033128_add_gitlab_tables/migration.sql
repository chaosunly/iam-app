-- CreateTable
CREATE TABLE "gitlab_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gitlab_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gitlab_projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "group_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gitlab_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gitlab_role_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gitlab_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gitlab_groups_name_key" ON "gitlab_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "gitlab_projects_name_key" ON "gitlab_projects"("name");

-- CreateIndex
CREATE INDEX "gitlab_projects_group_id_idx" ON "gitlab_projects"("group_id");

-- CreateIndex
CREATE INDEX "gitlab_role_assignments_user_id_idx" ON "gitlab_role_assignments"("user_id");

-- CreateIndex
CREATE INDEX "gitlab_role_assignments_resource_type_resource_id_idx" ON "gitlab_role_assignments"("resource_type", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "gitlab_role_assignments_user_id_resource_type_resource_id_key" ON "gitlab_role_assignments"("user_id", "resource_type", "resource_id");

-- AddForeignKey
ALTER TABLE "gitlab_projects" ADD CONSTRAINT "gitlab_projects_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "gitlab_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
