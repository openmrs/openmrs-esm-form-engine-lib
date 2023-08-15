import React, { useState } from 'react';
import { Button } from '@carbon/react';
import { configSchema } from '../../../config';
import { useParams } from 'react-router-dom';

const OHRIAnnotate = ({ imageUrl }) => {
  // Fetch configuration from the configSchema
  const config = configSchema;

  // Get the patientUuid from the URL parameters
  const { patientUuid } = useParams();

  // State to store the annotated image URL
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState(null);

  // Callback function to receive the annotated image URL and update state
  const receiveAnnotatedImageUrl = (url) => {
    setAnnotatedImageUrl(url);
  };

  // Handle the annotation click event
  const handleAnnotateClick = () => {
    // Open the annotation app in a new tab, passing the callback function
    const annotationUrl = `${config.drawingTool.url}?patientUuid=${patientUuid}&imageUrl=${imageUrl}&callback=receiveAnnotatedImageUrl`;
    window.open(annotationUrl, '_blank');
  };

  return (
    <div>
      {/* Annotate button */}
      <Button kind="ghost" onClick={handleAnnotateClick}>
        Annotate
      </Button>

      {/* Display the annotated image using the received URL */}
      {annotatedImageUrl && (
        <div>
          <img src={annotatedImageUrl} alt="Annotated Image" />
        </div>
      )}
    </div>
  );
};

export default OHRIAnnotate;
