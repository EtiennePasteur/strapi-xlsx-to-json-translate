import {
  Button,
  Flex,
  Typography,
  Field,
  Box,
  Alert,
  Loader,
  SingleSelect,
  SingleSelectOption,
  TextInput,
} from '@strapi/design-system';
import { getFetchClient } from '@strapi/strapi/admin';
import { useState, useRef, useEffect } from 'react';
import { Check, Cross, Upload } from '@strapi/icons';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface UploadStatus {
  type: 'initial' | 'uploading' | 'success' | 'error';
  message?: string;
}

const HomePage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>({ type: 'initial' });
  const [existingFolders, setExistingFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [customFolderName, setCustomFolderName] = useState<string>('');
  const [isCustomFolder, setIsCustomFolder] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing folders on component mount
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const { get } = getFetchClient();
        const result = await get<{ folders: string[] }>('/strapi-xlsx-to-json-translate/folders');
        setExistingFolders(result.data.folders || []);
      } catch (error) {
        console.error('Error fetching folders:', error);
      }
    };
    fetchFolders();
  }, []);

  // Auto-update folder name based on file name
  useEffect(() => {
    if (file) {
      const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
      // Check if this filename matches an existing folder
      if (existingFolders.includes(fileNameWithoutExt)) {
        setSelectedFolder(fileNameWithoutExt);
        setCustomFolderName(fileNameWithoutExt);
        setIsCustomFolder(false);
      } else {
        // New folder will be created
        setSelectedFolder('__create_new__');
        setCustomFolderName(fileNameWithoutExt);
        setIsCustomFolder(true);
      }
    }
  }, [file, existingFolders]);

  const validateFile = (file: File): string | null => {
    // Validate file type
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!validExtensions.includes(fileExtension)) {
      return 'Please upload a valid Excel file (.xlsx or .xls)';
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }

    // Validate file name
    if (file.size === 0) {
      return 'File is empty';
    }

    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validationError = validateFile(selectedFile);

      if (validationError) {
        setStatus({ type: 'error', message: validationError });
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setFile(selectedFile);
        setStatus({ type: 'initial' });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    // Validate folder name
    const folderName = customFolderName.trim();
    if (!folderName) {
      setStatus({ type: 'error', message: 'Please provide a folder name' });
      return;
    }

    const validFolderNameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validFolderNameRegex.test(folderName)) {
      setStatus({
        type: 'error',
        message: 'Invalid folder name. Only alphanumeric characters, hyphens, and underscores are allowed',
      });
      return;
    }

    setStatus({ type: 'uploading' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderName', folderName);

    try {
      const { post } = getFetchClient();
      const result = await post<{ code: number; message: string }>(
        '/strapi-xlsx-to-json-translate/upload',
        formData
      );

      if (result.data.code === 200) {
        setStatus({
          type: 'success',
          message: result.data.message || 'File uploaded and processed successfully!',
        });
        // Refresh folder list
        const { get } = getFetchClient();
        const foldersResult = await get<{ folders: string[] }>('/strapi-xlsx-to-json-translate/folders');
        setExistingFolders(foldersResult.data.folders || []);
      } else {
        setStatus({
          type: 'error',
          message: result.data.message || 'File upload failed!',
        });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'File upload failed!',
      });
    }
  };

  const handleReset = () => {
    setFile(null);
    setStatus({ type: 'initial' });
    setSelectedFolder('');
    setCustomFolderName('');
    setIsCustomFolder(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFolderSelect = (value: string) => {
    setSelectedFolder(value);
    if (value === '__create_new__') {
      setIsCustomFolder(true);
      setCustomFolderName('');
    } else {
      setCustomFolderName(value);
      setIsCustomFolder(false);
    }
  };

  return (
    <Box padding={8}>
      <Flex direction="column" alignItems="flex-start" gap={6}>
        {/* Header */}
        <Flex direction="column" alignItems="flex-start" gap={2}>
          <Typography variant="alpha" as="h1">
            XLSX to JSON Translator
          </Typography>
          <Typography variant="omega" textColor="neutral600">
            Upload an Excel file with translations to convert them into JSON files. Choose a destination
            folder from existing ones or create a new one.
          </Typography>
        </Flex>

        {/* File Upload Section */}
        <Box
          style={{ width: '100%', maxWidth: '600px' }}
        >
          <Field.Root>
            <Field.Label>Select Excel File</Field.Label>
            <Flex direction="column" alignItems="flex-start" gap={2}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx"
                onChange={handleFileChange}
                disabled={status.type === 'uploading'}
                style={{
                  padding: '8px',
                  border: '1px solid #dcdce4',
                  borderRadius: '4px',
                  width: '100%',
                  cursor: status.type === 'uploading' ? 'not-allowed' : 'pointer',
                }}
              />
              <Typography variant="pi" textColor="neutral600">
                Maximum file size: 10MB. Supported formats: .xlsx, .xls
              </Typography>
            </Flex>
          </Field.Root>
        </Box>

        {/* Destination Folder Section */}
        {file && (
          <Box style={{ width: '100%', maxWidth: '600px' }}>
            <Flex direction="column" gap={2}>
              <Flex gap={4} style={{ width: '100%' }}>
                <Box style={{ flex: 1 }}>
                  <Field.Root>
                    <Field.Label>Destination Folder</Field.Label>
                    <SingleSelect
                      value={selectedFolder}
                      onChange={handleFolderSelect}
                      placeholder="Select a folder"
                      disabled={status.type === 'uploading'}
                      onClear={() => {
                        setSelectedFolder('');
                        setCustomFolderName('');
                        setIsCustomFolder(false);
                      }}
                    >
                      <SingleSelectOption value="__create_new__">
                        + Create new folder
                      </SingleSelectOption>
                      {existingFolders.length > 0 && existingFolders.map((folder) => (
                        <SingleSelectOption key={folder} value={folder}>
                          {folder}
                        </SingleSelectOption>
                      ))}
                    </SingleSelect>
                  </Field.Root>
                </Box>

                {isCustomFolder && (
                  <Box style={{ flex: 1 }}>
                    <Field.Root>
                      <Field.Label>New Folder Name</Field.Label>
                      <TextInput
                        value={customFolderName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setCustomFolderName(e.target.value);
                        }}
                        placeholder="Enter folder name (e.g., my-translations)"
                        disabled={status.type === 'uploading'}
                      />
                    </Field.Root>
                  </Box>
                )}
              </Flex>

              <Typography variant="pi" textColor="neutral600">
                {isCustomFolder ? (
                  <>
                    Only alphanumeric characters, hyphens, and underscores allowed. Files will be saved to{' '}
                    <code>/public/i18n/{customFolderName || '[folder-name]'}/</code>
                  </>
                ) : (
                  customFolderName && (
                    <>
                      Files will be saved to <code>/public/i18n/{customFolderName}/</code>
                    </>
                  )
                )}
              </Typography>
            </Flex>
          </Box>
        )}

        {/* File Info */}
        {file && status.type !== 'uploading' && (
          <Alert variant="default" title="File selected:" style={{ width: '100%', maxWidth: '600px' }} onClose={handleReset}>
            <Typography paddingLeft={6} style={{ display: 'block' }}>
              <strong>Name:</strong> {file.name}
              <br />
              <strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB
            </Typography>
          </Alert>
        )}

        {/* Status Messages */}
        {status.type === 'uploading' && (
          <Flex gap={2} alignItems="center">
            <Loader small />
            <Typography>Processing file...</Typography>
          </Flex>
        )}

        {status.type === 'success' && (
          <Alert
            variant="success"
            title="Success"
            onClose={handleReset}
            style={{ width: '100%', maxWidth: '600px' }}
          >
            {status.message}
          </Alert>
        )}

        {status.type === 'error' && status.message && (
          <Alert
            variant="danger"
            title="Error"
            onClose={() => setStatus({ type: 'initial' })}
            style={{ width: '100%', maxWidth: '600px' }}
          >
            {status.message}
          </Alert>
        )}

        {/* Action Buttons */}
        <Flex gap={2}>
          {file && status.type !== 'uploading' && status.type !== 'success' && (
            <>
              <Button
                onClick={handleUpload}
                disabled={!file}
                startIcon={<Upload />}
              >
                Upload and Process
              </Button>
              <Button onClick={handleReset} variant="tertiary">
                Clear
              </Button>
            </>
          )}

          {status.type === 'success' && (
            <Button onClick={handleReset} startIcon={<Upload />}>
              Upload Another File
            </Button>
          )}
        </Flex>

        {/* Instructions */}
        <Box
          background="neutral100"
          borderRadius="4px"
          style={{ width: '100%', maxWidth: '600px' }}
        >
          <Typography variant="omega" fontWeight="bold" marginBottom={2}>
            Expected Excel Format:
          </Typography>
          <Box
            as="pre"
            style={{
              fontSize: '12px',
              overflow: 'auto',
              background: 'white',
              padding: '8px',
              borderRadius: '4px',
            }}
          >
            {`| Informations | Key              | en       | fr       |
|--------------|------------------|----------|----------|
| Description  | app.title        | My App   | Mon App  |
| Description  | app.welcome.text | Welcome  | Bienvenue|`}
          </Box>
          <Typography variant="pi" textColor="neutral600" marginTop={2}>
            The plugin will create separate JSON files for each language column (en.json, fr.json,
            etc.) in the <code>/public/i18n/[filename]/</code> directory.
          </Typography>
        </Box>
      </Flex>
    </Box>
  );
};

export { HomePage };
