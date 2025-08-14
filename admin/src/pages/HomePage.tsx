import { Button, Flex, TextInput, Typography } from '@strapi/design-system';
import { getFetchClient } from '@strapi/strapi/admin';
import { useState } from 'react';

const HomePage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'initial' | 'uploading' | 'success' | string>('initial');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setStatus('initial');
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (file) {
      setStatus('uploading');

      const formData = new FormData();
      formData.append('file', file);

      try {
        const { post } = getFetchClient();
        const result = await post<{code: number; message: string }>('/strapi-xlsx-to-json-translate/upload', formData);

        if (result.data.code === 200) {
          setStatus('success');
        } else {
          setStatus(result.data.message || 'File upload failed!');
        }
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'File upload failed!');
      }
    }
  };

  return (
    <Flex
      gap={{
        initial: 4,
      }}
      direction={{
        initial: 'column',
      }}
      alignItems={{
        initial: 'flex-start',
      }}
      padding={[8, 10]}
    >
      <Typography variant="alpha" as="h1">
        Strapi XLSX to JSON Translate
      </Typography>
      <TextInput
        label="Upload xlsx file"
        type="file"
        accept=".xls,.xlsx"
        onChange={handleFileChange}
      />

      <Flex
        gap={{
          initial: 4,
        }}
        direction={{
          initial: 'row',
        }}
        alignItems={{
          initial: 'center',
        }}
      >
        {file && <Button onClick={handleUpload}>Submit</Button>}
        <Result status={status} />
      </Flex>
    </Flex>
  );
};

const Result = ({ status }: { status: string }) => {
  if (status === 'success') {
    return (
      <Typography variant="omega" as="p">
        ✅ File uploaded successfully!
      </Typography>
    );
  } else if (status === 'uploading') {
    return (
      <Typography variant="omega" as="p">
        ⏳ Uploading selected file...
      </Typography>
    );
  } else if (status !== 'initial') {
    return (
      <Typography variant="omega" as="p">
        ❌ {status || 'File upload failed!'}
      </Typography>
    );
  } else {
    return null;
  }
};

export { HomePage };
