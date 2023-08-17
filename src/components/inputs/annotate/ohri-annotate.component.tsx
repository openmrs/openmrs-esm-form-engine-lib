import React, { useState } from 'react';
import { Button } from '@carbon/react';
import { configSchema } from '../../../config';
import { usePatient } from '@openmrs/esm-framework';

const OHRIAnnotate = ({ imageUrl }) => {
  // State to track whether the annotated image has been saved
  const [isImageSaved, setIsImageSaved] = useState(false);

  // Fetch configuration from the configSchema
  const config = configSchema;

  // Get the patientUuid from the URL parameters
  const { patientUuid } = usePatient();

  // State to store the annotated image URL
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState(null);

  // Callback function to receive the annotated image URL and update state
  const receiveAnnotatedImageUrl = url => {
    setAnnotatedImageUrl(url);
  };

  // eslint-disable-next-line no-console
  console.log('imageUrl:', imageUrl);

  // Handle the annotation click event
  const handleAnnotateClick = () => {
    //set the flag to false before opening the annotation tool.
    setIsImageSaved(false);

    // Open the annotation app in a new tab, passing the callback function
    // Pass additional query parameters, such as imageUrl, to the annotation app
    const annotationUrl = `${config.drawingTool.url}?patientUuid=${patientUuid}&imageUrl=${encodeURIComponent(
      imageUrl,
    )}&receiveAnnotatedImageUrl=${receiveAnnotatedImageUrl}`;
    window.open(annotationUrl, '_blank');
  };

  return (
    <div>
      {/* Annotate button */}
      <Button kind="ghost" onClick={handleAnnotateClick}>
        Annotate
      </Button>

      {/* Display the annotated image using the received URL */}
      {isImageSaved && annotatedImageUrl && (
        <div>
          <img src={annotatedImageUrl} alt="Annotated" />
        </div>
      )}
    </div>
  );
};

export default OHRIAnnotate;
