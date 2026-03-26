# VINote Architecture

## Current Scope

The codebase is now organized around a single v1 workflow:

1. Authenticate with Supabase.
2. Submit a video URL to the FastAPI backend.
3. Run the note-generation pipeline.
4. Save the resulting Markdown note into Supabase.
5. Continue editing the note in the frontend editor.

Team sharing, nested folders, and public link flows are still present in the schema history, but they are not treated as active product scope in the current UI and service layout.

## Backend Structure

### API layer

- `main.py`: process entrypoint.
- `app/__init__.py`: FastAPI app factory and router registration.
- `app/routers/note.py`: note generation and task polling endpoints.
- `app/routers/model_profiles.py`: user-managed LLM profile endpoints.

### Domain services

- `app/services/note_service.py`: orchestration only.
- `app/services/transcription_service.py`: transcriber factory and audio transcription helpers.
- `app/services/llm_service.py`: runtime LLM config resolution and summarizer factory.
- `app/services/screenshot_service.py`: screenshot placeholder replacement.
- `app/services/task_artifact_service.py`: task directories, status files, cached artifacts, and result files.
- `app/services/auth_service.py`: Supabase JWT decoding.
- `app/services/model_profile_service.py`: orchestration for model profile selection and default promotion.
- `app/services/model_profile_repository.py`: encrypted model profile persistence against Supabase.
- `app/services/model_profile_connection_service.py`: provider-specific connection probes.

### Infra and model boundaries

- `app/downloaders/`: video and audio acquisition.
- `app/transcribers/`: speech-to-text implementations.
- `app/llm/`: summarizer adapters and prompts.
- `app/models/`: request models and pipeline result models.

### Design rule

Route handlers should validate inputs and map HTTP concerns only. Pipeline coordination lives in `note_service.py`. Provider-specific details live in the helper services or provider packages.

## Frontend Structure

### App shell

- `frontend/src/App.tsx`: route composition only.
- `frontend/src/components/Layout/`: shell, header, sidebar, theme switch.
- `frontend/src/components/Settings/`: settings tab panels and model-profile UI.
- Route pages are lazy-loaded so the editor and Markdown renderer do not inflate the landing bundle.

### Feature areas

- `frontend/src/pages/Home.tsx`: recent-note overview.
- `frontend/src/pages/Notes.tsx`: note library.
- `frontend/src/pages/NoteGenerator.tsx`: generation flow.
- `frontend/src/pages/NoteEditor.tsx`: editing and preview.
- `frontend/src/pages/Settings.tsx`: auth, model profile, appearance settings.

### State boundaries

- `frontend/src/stores/authStore.ts`: Supabase session lifecycle.
- `frontend/src/stores/modelProfileStore.ts`: model profile CRUD and testing.
- `frontend/src/stores/noteLibraryStore.ts`: persisted notes from Supabase.
- `frontend/src/stores/noteGenerationStore.ts`: transient pipeline progress state.
- `frontend/src/stores/themeStore.ts`: theme preference.

### Design rule

Persistent business data and transient UI workflow state must not share a store unless they change for the same reason. Notes and generation progress are intentionally separated for that reason.

## Data Ownership

- Supabase owns user accounts and saved notes.
- The FastAPI backend owns the generation pipeline and task artifacts under `output/`.
- The frontend never stores provider API keys directly; it only sends them to backend model-profile endpoints when the user creates or tests a profile.

## Canonical Directories

- Use root `supabase/` as the canonical backend integration directory.
- The old `frontend/supabase/` setup has been removed from the tracked architecture and should not receive new changes.
- Treat `data/` and `output/` as runtime-only directories.

## Next Cleanup Targets

1. Reduce the remaining syntax-highlighter chunk or replace it with a lighter renderer.
2. Expand automated backend coverage beyond service orchestration into API-level smoke tests.
3. Decide whether local audio upload is a real browser feature or a desktop-only flow.
