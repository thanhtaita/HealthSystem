import "./Assign.css";
import { useEffect, useState } from "react";
import { AiOutlineDelete } from "react-icons/ai";
import { FaRegCalendarAlt } from "react-icons/fa";
import { MdCancel } from "react-icons/md";

const Assign = () => {
  const [option, setOption] = useState("patient");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [listInfo, setListInfo] = useState([]);
  const [searchInfoList, setSearchInfoList] = useState([]);
  const [searchInfo, setSearchInfo] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    console.log(option);
    const fetchData = async () => {
      const response = await fetch(
        `http://localhost:3600/admin/search/${option}`,
        {
          method: "GET",
          credentials: "include",
        }
      );
      const data = await response.json();
      console.log(data);
      if (!data) {
        window.location.assign("/");
      }
      setListInfo(data);
      setSearchInfoList(data);
    };
    fetchData();
  }, [option]);

  const handleSearch = (e) => {
    console.log(e.target.value);
    if (e.target.value === "") {
      setSearchInfoList(listInfo);
    } else {
      if (option === "patient") {
        setSearchInfoList(
          listInfo.filter((element) => element?.SSN.startsWith(e.target.value))
        );
      } else {
        setSearchInfoList(
          listInfo.filter((element) =>
            String(element?.["Employee ID"]).startsWith(e.target.value)
          )
        );
      }
    }
  };

  const handleOptionChange = (e) => {
    setOption(e.target.value);
  };

  const handleDelete = async (deletedId) => {
    const userConfirmed = window.confirm(
      "Are you sure you want to delete this user?"
    );
    if (userConfirmed) {
      const response = await fetch(
        `http://localhost:3600/admin/delete/${option}/${deletedId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      const data = await response.json();
      console.log(data);
      if (data) {
        alert("User deleted successfully!");
        window.location.reload();
      } else {
        alert("Something went wrong! Please try again.");
      }
    }
  };

  const fetchNurseSchedules = async (personId) => {
    let url = `http://localhost:3600/admin/patient/schedule/${personId}`;
    if (option == "nurse") {
      url = `http://localhost:3600/admin/nurse/schedule/${personId}`;
    }
    const fetchSchedule = async () => {
      try {
        const response = await fetch(url, {
          method: "GET",
          credentials: "include",
        });

        if (response.status === 403) {
          throw new Error("You are not authorized to view this page.");
        }

        const data = await response.json();
        console.log("schedules ", option, " ", data);
        setSchedules(data);
      } catch (error) {
        console.error("Error fetching nurse schedules:", error.message);
      }
    };

    fetchSchedule();
  };

  return (
    <div className="assign-box">
      <div className="assign">
        <div className="assign-container">
          <div className="search-container">
            <input
              type="text"
              placeholder={`Search for ${option} by id`}
              onChange={handleSearch}
            />
            <select id="example" name="example" onChange={handleOptionChange}>
              <option value="patient">patient</option>
              <option value="nurse">nurse</option>
            </select>
          </div>
          <div className="info-container">
            {searchInfoList.map((info, index) => (
              <div className="info" key={index}>
                <div className="info-basic">
                  <div>{`${info?.Fname || " "} ${info?.MI || " "} ${
                    info?.Lname || " "
                  }`}</div>
                  <div>{info?.SSN || info?.["Employee ID"]}</div>
                </div>
                <div className="icons">
                  <FaRegCalendarAlt
                    className="icon-item"
                    onClick={() => {
                      setSelectedPerson(info);
                      setIsModalOpen(true);
                      fetchNurseSchedules(info?.idpatient || info?.idnurse);
                    }}
                  />
                  <AiOutlineDelete
                    size={17}
                    className="icon-item"
                    onClick={() =>
                      handleDelete(info?.idpatient || info?.idnurse)
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {isModalOpen && (
        <div className="modal">
          <div className="modal-container">
            <h1>{selectedPerson?.Fname}&apos;s Schedule</h1>
            <MdCancel
              size={30}
              className="cancel-icon"
              onClick={() => {
                setIsModalOpen(false);
              }}
            />
            <div className="schedule-container">
              {schedules.map((schedule, index) => (
                <div className="schedule-item" key={index}>
                  <div className="info-basic">
                    <div>Time: {schedule?.dateinfo}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assign;
