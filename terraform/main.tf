terraform
resource "google_developer_connect_connection" "my-connection" {
  provider = google-beta
  project = google_firebase_project.apphosting.project
  location = "name-of-region-for-service"
  github_config {
    authorizer_credential {
      github_app = {}
    }
    repository = "https://github.com/thebond410/LS-PRODUCTION-.git"
  }
}